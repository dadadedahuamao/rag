"""本地哈希嵌入：将文本映射为固定维度的稠密向量。

无需任何外部服务或模型权重，纯本地可运行；基于字符 1/2-gram 的
特征哈希 + TF 加权 + L2 归一化，能为中文短文本提供可用的语义相似度，
满足 Elasticsearch kNN 向量检索的演示与集成需求。若后续接入真实
Embedding 服务，只需替换 embed_text 实现即可，索引维度保持一致。
"""
from __future__ import annotations

import hashlib
import math
import re

from app.config import settings

DIM = settings.embedding_dim

_token_re = re.compile(r"[0-9a-zA-Z]+|[\u4e00-\u9fff]")


def _tokens(text: str) -> list[str]:
    text = (text or "").lower()
    base = _token_re.findall(text)
    grams = list(base)
    # 追加中文/通用 2-gram，增强语义区分度
    for i in range(len(base) - 1):
        grams.append(base[i] + base[i + 1])
    return grams


def _bucket(token: str) -> int:
    h = hashlib.md5(token.encode("utf-8")).hexdigest()
    return int(h, 16) % DIM


def embed_text(text: str) -> list[float]:
    """返回 L2 归一化后的 DIM 维向量。"""
    vec = [0.0] * DIM
    for tok in _tokens(text):
        vec[_bucket(tok)] += 1.0
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))
