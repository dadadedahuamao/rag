"""DeepSeek 大模型客户端（OpenAI 兼容协议）。

- 配置了 LLM_API_KEY 时调用真实 DeepSeek，支持流式逐 token 输出；
- 未配置或调用异常时回退到内置模拟回答，保证问答链路始终可用。
"""
from __future__ import annotations

import logging
from collections.abc import Iterator

from app.config import settings

logger = logging.getLogger("rag.llm")

_client = None


def llm_available() -> bool:
    return settings.llm_ready


def _get_client():
    global _client
    if _client is None:
        from openai import OpenAI

        _client = OpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)
    return _client


SYSTEM_PROMPT = (
    "你是企业知识库智能问答助手。请严格依据提供的【上下文】用中文回答用户问题，"
    "答案要条理清晰。若上下文不足以回答，请如实说明未在知识库中找到相关内容，不要编造。"
)


def build_messages(query: str, context: str, history: list[dict] | None = None) -> list[dict]:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in (history or [])[-6:]:
        messages.append({"role": h["role"], "content": h["content"]})
    user_content = f"【上下文】\n{context}\n\n【问题】\n{query}" if context else query
    messages.append({"role": "user", "content": user_content})
    return messages


def chat_once(messages: list[dict], max_tokens: int = 512) -> str:
    """非流式单次调用，用于路由/评估/改写等短判断任务。失败时抛异常由上层降级。"""
    client = _get_client()
    resp = client.chat.completions.create(
        model=settings.llm_model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.1,
    )
    return (resp.choices[0].message.content or "").strip()


def stream_chat(messages: list[dict]) -> Iterator[str]:
    """流式返回文本增量。真实调用失败时抛异常，由上层决定回退。"""
    client = _get_client()
    resp = client.chat.completions.create(
        model=settings.llm_model,
        messages=messages,
        stream=True,
    )
    for chunk in resp:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content
