"""RAG 问答编排：语义缓存 -> LangGraph 状态图（路由/分解/自纠错检索/生成/幻觉校验）-> 持久化。

对外产出 SSE 数据行（每行 data 为 JSON），事件类型：
  {"type":"routing","kbs":[{"id","name"}]}  已自动匹配到的知识库
  {"type":"retrieving"}                      检索阶段
  {"type":"stage","stage":"..."}             扩展阶段（grading/rewriting/verifying/regenerating）
  {"type":"generating"}                      开始生成
  {"type":"token","delta":"..."}             逐段回答文本
  {"type":"restart"}                         幻觉校验未通过重新生成，前端应清空当前回答
  {"type":"citations","citations":[...]}     引用来源
  {"type":"done","conversationId":N,"messageId":N}
  {"type":"error","message":"..."}
未配置大模型 Key 时图内节点自动直通，回退为基于检索片段的摘要式回答，保证链路可用。
"""
from __future__ import annotations

import json
import logging
from collections.abc import Iterator

from app.database import SessionLocal
from app.models import Citation, Conversation, KnowledgeBase, Message
from app.services import redis_client
from app.services.embedding import embed_text
from app.services.rag_graph import rag_flow

logger = logging.getLogger("rag.qa")


def _sse(obj: dict) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


def _load_history(db, conversation_id: int | None, user_id: int) -> list[dict]:
    if not conversation_id:
        return []
    conv = db.get(Conversation, conversation_id)
    if not conv or conv.user_id != user_id:
        return []
    return [{"role": m.role, "content": m.content} for m in conv.messages]


def _chunk_text(text: str, size: int = 4) -> Iterator[str]:
    for i in range(0, len(text), size):
        yield text[i : i + size]


def stream_answer(
    *,
    user_id: int,
    query: str,
    conversation_id: int | None,
    kb_ids: list[int],
) -> Iterator[str]:
    """生成 SSE 事件流。kb_ids 为调用方已鉴权过滤后的可检索知识库范围。"""
    db = SessionLocal()
    try:
        qvec = embed_text(query)
        history = _load_history(db, conversation_id, user_id)

        # 候选知识库元信息（供图内路由节点决策）
        kb_catalog: list[dict] = []
        if kb_ids:
            rows = (
                db.query(KnowledgeBase).filter(KnowledgeBase.id.in_(kb_ids)).all()
            )
            kb_catalog = [
                {"id": k.id, "name": k.name, "description": k.description or ""}
                for k in rows
            ]

        # 语义缓存（按候选知识库范围隔离，避免跨权限泄漏）；命中则跳过整个状态图
        scope = "kb_" + "_".join(str(x) for x in sorted(kb_ids)) if kb_ids else "all"
        cached = redis_client.semantic_cache_get(scope, qvec)

        answer = ""
        citations: list[dict] = []
        routed_kbs: list[dict] = []

        if cached:
            redis_client.incr_cache(True)
            yield _sse({"type": "routing", "kbs": []})
            yield _sse({"type": "generating"})
            answer = cached["answer"]
            citations = cached.get("citations") or []
            for piece in _chunk_text(answer):
                yield _sse({"type": "token", "delta": piece})
        else:
            redis_client.incr_cache(False)
            init_state = {
                "original_query": query,
                "kb_ids": kb_ids,
                "kb_catalog": kb_catalog,
                "history": history,
            }
            final_state: dict = {}
            # custom 流转发图内节点事件；values 流跟踪最终状态用于持久化
            for mode, chunk in rag_flow.stream(
                init_state, stream_mode=["custom", "values"]
            ):
                if mode == "custom":
                    yield _sse(chunk)
                else:
                    final_state = chunk
            answer = final_state.get("answer", "")
            citations = final_state.get("citations") or []
            routed_kbs = final_state.get("routed_kbs") or []
            if answer:
                redis_client.semantic_cache_set(scope, qvec, answer, citations)

        redis_client.incr_qa()
        yield _sse({"type": "citations", "citations": citations})

        conv_id, msg_id = _persist(
            db, user_id, conversation_id, query, answer, citations, routed_kbs
        )
        yield _sse({"type": "done", "conversationId": conv_id, "messageId": msg_id})
    except Exception as e:  # noqa: BLE001
        logger.exception("问答流处理失败")
        yield _sse({"type": "error", "message": str(e)[:200]})
    finally:
        db.close()


def _persist(
    db,
    user_id: int,
    conversation_id: int | None,
    query: str,
    answer: str,
    citations: list[dict],
    routed_kbs: list[dict],
) -> tuple[int, int]:
    """保存用户提问与助手回答（含引用），返回 (会话id, 助手消息id)。"""
    conv = db.get(Conversation, conversation_id) if conversation_id else None
    if not conv or conv.user_id != user_id:
        kb_name = routed_kbs[0]["name"] if routed_kbs else ""
        kb_id = routed_kbs[0]["id"] if routed_kbs else 0
        conv = Conversation(
            user_id=user_id,
            title=query[:30] or "新会话",
            kb_id=kb_id,
            kb_name=kb_name,
        )
        db.add(conv)
        db.flush()

    db.add(Message(conversation_id=conv.id, role="user", content=query))
    assistant = Message(conversation_id=conv.id, role="assistant", content=answer)
    db.add(assistant)
    db.flush()
    for c in citations:
        db.add(
            Citation(
                message_id=assistant.id,
                doc_id=c.get("docId", 0),
                title=c.get("title", ""),
                page=c.get("page", 1),
                snippet=c.get("snippet", ""),
            )
        )
    db.commit()
    return conv.id, assistant.id
