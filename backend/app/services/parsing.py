"""文档解析与切分：支持 PDF/Word/Markdown/TXT/HTML。

解析产出 (页码, 文本) 列表，再按「标题分节 -> 句子边界组块」切分为 Chunk：
1. 识别标题行（Markdown 用 # 层级，其余类型用 第X章/一、 等编号模式），
   维护标题栈生成 title_path；
2. 小节内按句子边界拼装到目标长度，重叠部分保留完整句子，
   避免定长硬切导致的碎句（如以句号开头的块）。
"""
from __future__ import annotations

import logging
import re

logger = logging.getLogger("rag.parsing")

EXT_TYPE = {
    "pdf": "PDF",
    "doc": "Word",
    "docx": "Word",
    "md": "Markdown",
    "markdown": "Markdown",
    "txt": "TXT",
    "text": "TXT",
    "html": "HTML",
    "htm": "HTML",
}


def detect_file_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"
    return EXT_TYPE.get(ext, "TXT")


def extract_pages(file_path: str, file_type: str) -> list[tuple[int, str]]:
    """返回 [(页码, 文本), ...]。解析失败抛异常，交由调用方标记失败。"""
    if file_type == "PDF":
        from pypdf import PdfReader

        reader = PdfReader(file_path)
        pages = []
        for i, page in enumerate(reader.pages, start=1):
            pages.append((i, page.extract_text() or ""))
        return pages or [(1, "")]

    if file_type == "Word":
        import docx

        doc = docx.Document(file_path)
        text = "\n".join(p.text for p in doc.paragraphs)
        return [(1, text)]

    # Markdown / TXT / HTML 统一按纯文本读取
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        raw = f.read()

    if file_type == "HTML":
        from bs4 import BeautifulSoup

        raw = BeautifulSoup(raw, "lxml").get_text("\n")
    elif file_type == "Markdown":
        # 保留 # 标题结构供切分阶段提取 title_path，仅清理强调/代码/引用标记
        raw = re.sub(r"[>*`]+", " ", raw)
    return [(1, raw)]


_MD_HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
# 非 Markdown 的编号标题：第X章/节、一、二、…（要求整行短且不含句读，降低误判）
_CHAPTER_HEADING = re.compile(r"^第[一二三四五六七八九十百0-9]{1,4}[章节篇部].{0,20}$")
_CN_NUM_HEADING = re.compile(r"^[一二三四五六七八九十]{1,3}[、.．].{1,20}$")
_BRACKET_HEADING = re.compile(r"^【[^【】]{1,22}】$")  # 如【一、总则】


def _detect_heading(line: str, file_type: str) -> tuple[int, str] | None:
    """识别标题行，返回 (层级, 标题文本)，非标题返回 None。"""
    s = line.strip()
    if not s:
        return None
    if file_type == "Markdown":
        m = _MD_HEADING.match(s)
        if m:
            return len(m.group(1)), m.group(2).strip()
        return None
    # 编号标题应为短行且不含句读符号
    if len(s) > 25 or any(ch in s for ch in "。，,；;：:？！"):
        return None
    if _CHAPTER_HEADING.match(s):
        return 1, s
    if _CN_NUM_HEADING.match(s):
        return 2, s
    if _BRACKET_HEADING.match(s):
        return 2, s.strip("【】")
    return None


def _split_sentences(text: str) -> list[str]:
    """按句末标点/换行切成句子片段（保留标点）。"""
    parts = re.split(r"(?<=[。！？；!?;\n])", text)
    return [p for p in parts if p.strip()]


def _pack_sentences(sentences: list[str], chunk_size: int, overlap: int) -> list[str]:
    """将句子拼装为不超过 chunk_size 的块，重叠部分保留完整句子。"""
    pieces: list[str] = []
    buf: list[str] = []
    buf_len = 0
    has_new = False  # buf 中是否含未输出的新句子（避免尾部仅剩重叠内容时重复输出）
    for sent in sentences:
        # 超长单句退化为硬切
        while len(sent) > chunk_size:
            if has_new and buf:
                pieces.append("".join(buf).strip())
            buf, buf_len, has_new = [], 0, False
            pieces.append(sent[:chunk_size].strip())
            sent = sent[chunk_size:]
        if not sent:
            continue
        if buf_len + len(sent) > chunk_size and has_new:
            pieces.append("".join(buf).strip())
            # 从尾部回收若干完整句子作为重叠上下文
            keep: list[str] = []
            keep_len = 0
            for prev in reversed(buf):
                if keep_len + len(prev) > overlap:
                    break
                keep.insert(0, prev)
                keep_len += len(prev)
            buf, buf_len, has_new = keep, keep_len, False
        buf.append(sent)
        buf_len += len(sent)
        has_new = True
    if has_new and buf:
        pieces.append("".join(buf).strip())
    return [p for p in pieces if p]


def split_pages(
    pages: list[tuple[int, str]],
    file_type: str = "TXT",
    chunk_size: int = 500,
    overlap: int = 80,
    min_chunk: int = 50,
) -> list[dict]:
    """将页面文本切分为 Chunk 列表：先按标题分节，节内按句子边界组块。"""
    chunks: list[dict] = []
    idx = 0
    titles: dict[int, str] = {}  # 标题栈：层级 -> 标题文本

    def _title_path() -> str:
        return " > ".join(titles[lv] for lv in sorted(titles))

    for page_no, text in pages:
        text = (text or "").strip()
        if not text:
            continue
        # 按标题行切成 (title_path, 正文) 小节，标题跨页延续
        sections: list[tuple[str, list[str]]] = []
        cur_lines: list[str] = []
        cur_path = _title_path()
        for line in text.splitlines():
            head = _detect_heading(line, file_type)
            if head:
                if cur_lines:
                    sections.append((cur_path, cur_lines))
                level, title = head
                for lv in [lv for lv in titles if lv >= level]:
                    titles.pop(lv)
                titles[level] = title
                cur_path = _title_path()
                cur_lines = [title]  # 标题文本保留在正文开头，增强检索语义
            else:
                cur_lines.append(line)
        if cur_lines:
            sections.append((cur_path, cur_lines))

        for path, lines in sections:
            body = "\n".join(lines).strip()
            if not body:
                continue
            for piece in _pack_sentences(_split_sentences(body), chunk_size, overlap):
                chunks.append(
                    {
                        "chunk_index": idx,
                        "title_path": path,
                        "content": piece,
                        "source_page": page_no,
                    }
                )
                idx += 1

    # 过短碎块（如孤立的文档标题行）并入相邻块，避免检索噪声
    merged: list[dict] = []
    for ck in chunks:
        if merged and len(ck["content"]) < min_chunk and merged[-1]["title_path"] == ck["title_path"]:
            merged[-1]["content"] += "\n" + ck["content"]
            continue
        merged.append(ck)
    if len(merged) > 1 and len(merged[0]["content"]) < min_chunk:
        merged[1]["content"] = merged[0]["content"] + "\n" + merged[1]["content"]
        merged.pop(0)
    for i, ck in enumerate(merged):
        ck["chunk_index"] = i
    return merged
