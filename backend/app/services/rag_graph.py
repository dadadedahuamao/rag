"""LangGraph 状态图编排：智能路由 -> 问题分解 -> 自纠错检索 -> 生成 -> 幻觉校验。

图结构（条件边带 * 号）：
    START -> plan -> retrieve -> grade -*-> generate -> verify -*-> END
                        ^           |            ^          |
                        |           v            +----------+（不合格时严格模式回炉）
                        +------- rewrite

节点通过 get_stream_writer 推送自定义事件（dict），由 rag.stream_answer 转为 SSE：
  {"type":"routing","kbs":[...]}   路由结果（plan 节点）
  {"type":"retrieving"}            检索开始
  {"type":"stage","stage":"grading|rewriting|verifying|regenerating"}  扩展阶段
  {"type":"generating"}            生成开始
  {"type":"token","delta":"..."}   逐段回答文本
  {"type":"restart"}               校验未通过重新生成，前端应清空当前回答缓冲

未配置大模型 Key 时，plan/grade/verify 均直通，行为退化为原始"检索+摘要"链路。
"""
from __future__ import annotations

import json
import logging
import re
from typing import TypedDict

from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph

from app.services import es_client, llm
from app.services.embedding import embed_text

logger = logging.getLogger("rag.graph")

MAX_REWRITES = 2   # 查询改写重试上限
MAX_GENERATES = 2  # 生成（含幻觉校验回炉）上限


class RagState(TypedDict, total=False):
    original_query: str        # 用户原始问题
    kb_ids: list[int]          # 权限过滤后的候选知识库
    kb_catalog: list[dict]     # 候选知识库元信息 [{id,name,description}]
    history: list[dict]        # 会话历史
    routed_kb_ids: list[int]   # 路由后的目标知识库
    routed_kbs: list[dict]     # 路由结果展示 [{id,name}]
    sub_queries: list[str]     # 检索子问题（多跳分解 / 改写后替换）
    hits: list[dict]           # 检索命中分块
    context: str               # 生成用上下文
    citations: list[dict]      # 引用来源
    answer: str                # 最终回答
    rewrite_count: int         # 已改写次数
    generate_count: int        # 已生成次数
    strict: bool               # 幻觉校验未通过后的严格重生成标记
    grounded: bool             # 幻觉校验结果
    used_llm: bool             # 本轮回答是否由大模型生成


# ---------------- 工具函数 ----------------
def _parse_json(text: str):
    """从大模型输出中提取 JSON（容忍 ```json 围栏与前后杂文）。"""
    text = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        text = m.group(1).strip()
    m = re.search(r"[\[{][\s\S]*[\]}]", text)
    if m:
        text = m.group(0)
    return json.loads(text)


def build_context(hits: list[dict]) -> tuple[str, list[dict]]:
    """将命中分块组织为编号上下文，并抽取去重后的引用列表。"""
    parts: list[str] = []
    citations: list[dict] = []
    seen: set[int] = set()
    for i, h in enumerate(hits, 1):
        title = h.get("doc_title", "")
        page = int(h.get("source_page", 1) or 1)
        content = h.get("content", "") or ""
        parts.append(f"[{i}] 《{title}》第 {page} 页：\n{content}")
        did = int(h.get("doc_id", 0) or 0)
        if did not in seen:
            seen.add(did)
            citations.append(
                {"docId": did, "title": title, "page": page, "snippet": content[:120]}
            )
    return "\n\n".join(parts), citations


def fallback_answer(query: str, hits: list[dict]) -> str:
    """未配置大模型时的检索摘要式回答。"""
    if hits:
        lines = ["根据知识库检索到的相关内容，为您整理如下：\n"]
        for i, h in enumerate(hits[:3], 1):
            snippet = (h.get("content", "") or "")[:140].strip()
            lines.append(f"{i}. {snippet} …")
        lines.append(
            "\n（提示：当前未配置大模型 API Key，以上为检索片段摘要；配置后可获得更完整的智能回答。）"
        )
        return "\n".join(lines)
    return (
        f"未在知识库中检索到与「{query}」相关的内容。\n\n"
        "请尝试调整提问方式，或确认相关文档已上传并完成索引。"
    )


def _hit_key(h: dict) -> tuple:
    return (
        int(h.get("doc_id", 0) or 0),
        int(h.get("source_page", 0) or 0),
        (h.get("content", "") or "")[:80],
    )


# ---------------- 图节点 ----------------
def plan_node(state: RagState) -> dict:
    """路由 + 多跳分解：一次 LLM 调用同时选定目标知识库并拆分子问题。"""
    writer = get_stream_writer()
    query = state["original_query"]
    kb_ids = state.get("kb_ids") or []
    catalog = state.get("kb_catalog") or []

    routed_ids = list(kb_ids)
    sub_queries = [query]

    if llm.llm_available() and len(catalog) > 1:
        kb_lines = "\n".join(
            f"- id={k['id']} 名称：{k['name']}（{k.get('description') or '无描述'}）"
            for k in catalog
        )
        prompt = (
            "你是企业知识库检索规划助手。请根据知识库列表与用户问题输出 JSON："
            '{"kb_ids": [与问题相关的知识库id], "sub_queries": ["检索子问题"]}。\n'
            "规则：\n"
            "1. kb_ids 只保留与问题明确相关的知识库，不确定时保留全部候选；\n"
            "2. 若问题涉及多个独立方面（如同时问报销和调休），拆分为 2-3 个子问题；"
            "否则 sub_queries 仅包含原问题；\n"
            "3. 只输出 JSON，不要任何解释。\n\n"
            f"【知识库列表】\n{kb_lines}\n\n【用户问题】\n{query}"
        )
        try:
            data = _parse_json(llm.chat_once([{"role": "user", "content": prompt}]))
            picked = [int(x) for x in data.get("kb_ids", []) if int(x) in kb_ids]
            if picked:
                routed_ids = picked
            subs = [str(s).strip() for s in data.get("sub_queries", []) if str(s).strip()]
            if subs:
                sub_queries = subs[:3]
        except Exception:  # noqa: BLE001
            logger.warning("检索规划失败，使用全量候选", exc_info=True)

    name_map = {k["id"]: k["name"] for k in catalog}
    routed_kbs = [
        {"id": kid, "name": name_map.get(kid, "")} for kid in routed_ids[:3]
    ]
    writer({"type": "routing", "kbs": routed_kbs})
    return {
        "routed_kb_ids": routed_ids,
        "routed_kbs": routed_kbs,
        "sub_queries": sub_queries,
        "rewrite_count": 0,
        "generate_count": 0,
        "strict": False,
    }


def retrieve_node(state: RagState) -> dict:
    """对每个子问题做混合检索，合并去重；路由范围无命中时回退全量候选。"""
    writer = get_stream_writer()
    writer({"type": "retrieving"})

    kb_ids = state.get("kb_ids") or []
    routed_ids = state.get("routed_kb_ids") or kb_ids
    sub_queries = state.get("sub_queries") or [state["original_query"]]

    if not kb_ids or not es_client.is_available():
        return {"hits": []}

    per_k = 6 if len(sub_queries) == 1 else 4

    def _search(ids: list[int]) -> list[dict]:
        merged: list[dict] = []
        seen: set[tuple] = set()
        for q in sub_queries:
            try:
                rows = es_client.hybrid_search(
                    q, embed_text(q), kb_ids=ids, allowed_tags=None, top_k=per_k
                )
            except Exception:  # noqa: BLE001
                logger.warning("混合检索失败: %s", q, exc_info=True)
                rows = []
            for h in rows:
                key = _hit_key(h)
                if key not in seen:
                    seen.add(key)
                    merged.append(h)
        return merged[:8]

    hits = _search(routed_ids)
    # 路由过窄导致零命中时，扩大到全部候选兜底
    if not hits and set(routed_ids) != set(kb_ids):
        hits = _search(kb_ids)
    return {"hits": hits}


def grade_node(state: RagState) -> dict:
    """检索质量评估：过滤无关分块，为条件边提供改写依据。"""
    hits = state.get("hits") or []
    if not llm.llm_available() or not hits:
        return {}

    writer = get_stream_writer()
    writer({"type": "stage", "stage": "grading"})

    numbered = "\n\n".join(
        f"[{i}] {(h.get('content', '') or '')[:300]}" for i, h in enumerate(hits, 1)
    )
    prompt = (
        "你是检索质量评估助手。请判断下列每个片段是否有助于回答用户问题，"
        '输出 JSON：{"relevant": [有帮助片段的编号]}。只输出 JSON。\n\n'
        f"【用户问题】\n{state['original_query']}\n\n【候选片段】\n{numbered}"
    )
    try:
        data = _parse_json(llm.chat_once([{"role": "user", "content": prompt}]))
        idx = {int(i) for i in data.get("relevant", [])}
        filtered = [h for i, h in enumerate(hits, 1) if i in idx]
    except Exception:  # noqa: BLE001
        logger.warning("检索评估失败，保留全部命中", exc_info=True)
        return {}

    # 全部被判无关且已无改写机会时，保留原命中兜底（由生成提示词自行取舍）
    if not filtered and state.get("rewrite_count", 0) >= MAX_REWRITES:
        return {}
    return {"hits": filtered}


def grade_route(state: RagState) -> str:
    """相关分块不足且还有改写额度时进入 rewrite，否则直接生成。"""
    if not llm.llm_available():
        return "generate"
    if len(state.get("hits") or []) >= 2:
        return "generate"
    if state.get("rewrite_count", 0) < MAX_REWRITES:
        return "rewrite"
    return "generate"


def rewrite_node(state: RagState) -> dict:
    """检索效果欠佳时改写查询后重新检索。"""
    writer = get_stream_writer()
    writer({"type": "stage", "stage": "rewriting"})

    tried = "；".join(state.get("sub_queries") or [])
    prompt = (
        "你是查询改写助手。以下问题在企业知识库中检索效果不佳，"
        "请改写为更利于全文与向量检索的查询：保留关键实体，替换口语表述为规范术语，"
        "可适当补充同义词。只输出改写后的一句查询文本。\n\n"
        f"【原问题】{state['original_query']}\n【已尝试查询】{tried}"
    )
    new_query = state["original_query"]
    try:
        text = llm.chat_once([{"role": "user", "content": prompt}], max_tokens=128)
        if text:
            new_query = text.splitlines()[0].strip()
    except Exception:  # noqa: BLE001
        logger.warning("查询改写失败，沿用原问题", exc_info=True)
    return {
        "sub_queries": [new_query],
        "rewrite_count": state.get("rewrite_count", 0) + 1,
    }


def generate_node(state: RagState) -> dict:
    """组织上下文并流式生成回答；strict 模式追加严格依据约束。"""
    writer = get_stream_writer()
    hits = state.get("hits") or []
    context, citations = build_context(hits)

    writer({"type": "generating"})

    answer = ""
    used_llm = False
    if llm.llm_available():
        try:
            messages = llm.build_messages(
                state["original_query"], context, state.get("history")
            )
            if state.get("strict"):
                messages[0]["content"] += (
                    "\n注意：上一次回答存在依据不足的内容。本次必须严格只使用"
                    "【上下文】中明确出现的信息作答，上下文未覆盖的部分请直接说明未找到，"
                    "不得推测或补充外部知识。"
                )
            for delta in llm.stream_chat(messages):
                answer += delta
                writer({"type": "token", "delta": delta})
            used_llm = True
        except Exception:  # noqa: BLE001
            logger.warning("大模型调用失败，回退摘要", exc_info=True)
            answer = ""
    if not used_llm:
        answer = fallback_answer(state["original_query"], hits)
        for i in range(0, len(answer), 4):
            writer({"type": "token", "delta": answer[i : i + 4]})

    return {
        "answer": answer,
        "context": context,
        "citations": citations,
        "used_llm": used_llm,
        "generate_count": state.get("generate_count", 0) + 1,
    }


def verify_node(state: RagState) -> dict:
    """幻觉校验：回答未忠于上下文且还有重生成额度时打开严格模式回炉。"""
    if (
        not state.get("used_llm")
        or not state.get("context")
        or not state.get("answer")
        or state.get("generate_count", 0) >= MAX_GENERATES
    ):
        return {"grounded": True}

    writer = get_stream_writer()
    writer({"type": "stage", "stage": "verifying"})

    prompt = (
        "你是答案审核助手。请判断【回答】中的关键事实是否均能在【上下文】中找到依据"
        "（允许合理概括与格式整理；回答中如实说明'未找到相关内容'也算合格）。"
        '输出 JSON：{"grounded": true/false}。只输出 JSON。\n\n'
        f"【上下文】\n{state['context'][:3000]}\n\n"
        f"【问题】\n{state['original_query']}\n\n【回答】\n{state['answer'][:2000]}"
    )
    try:
        data = _parse_json(llm.chat_once([{"role": "user", "content": prompt}]))
        grounded = bool(data.get("grounded", True))
    except Exception:  # noqa: BLE001
        logger.warning("幻觉校验失败，默认放行", exc_info=True)
        return {"grounded": True}

    if grounded:
        return {"grounded": True}
    # 未通过：通知前端清空缓冲，严格模式重新生成
    writer({"type": "restart"})
    writer({"type": "stage", "stage": "regenerating"})
    return {"grounded": False, "strict": True}


def verify_route(state: RagState) -> str:
    return END if state.get("grounded", True) else "generate"


# ---------------- 图构建 ----------------
def _build_graph():
    g = StateGraph(RagState)
    g.add_node("plan", plan_node)
    g.add_node("retrieve", retrieve_node)
    g.add_node("grade", grade_node)
    g.add_node("rewrite", rewrite_node)
    g.add_node("generate", generate_node)
    g.add_node("verify", verify_node)

    g.add_edge(START, "plan")
    g.add_edge("plan", "retrieve")
    g.add_edge("retrieve", "grade")
    g.add_conditional_edges(
        "grade", grade_route, {"generate": "generate", "rewrite": "rewrite"}
    )
    g.add_edge("rewrite", "retrieve")
    g.add_edge("generate", "verify")
    g.add_conditional_edges(
        "verify", verify_route, {"generate": "generate", END: END}
    )
    return g.compile()


rag_flow = _build_graph()
