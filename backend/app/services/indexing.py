"""文档索引编排：解析 -> 切分 -> 嵌入 -> 写入分块表与 ES，并维护任务状态。

默认以进程内后台线程执行（TASK_MODE=thread，适配 Windows 本地开发），
每个线程使用独立数据库会话。ES 不可用时降级为仅入库，任务仍标记成功但
提示未建向量索引；解析异常时任务与文档均标记失败。
"""
from __future__ import annotations

import logging
import threading
import uuid

from app.config import settings
from app.database import SessionLocal
from app.models import Chunk, Document, Task
from app.services import es_client
from app.services.embedding import embed_text
from app.services.parsing import extract_pages, split_pages

logger = logging.getLogger("rag.indexing")


def _new_task_id() -> str:
    return "task_" + uuid.uuid4().hex[:12]


def create_index_task(doc_id: int, task_type: str = "文档索引", target: str = "") -> str:
    """创建任务记录并异步执行索引，返回 task_id。"""
    task_id = _new_task_id()
    with SessionLocal() as db:
        db.add(
            Task(
                task_id=task_id,
                type=task_type,
                target=target,
                state="PENDING",
                progress=0,
                doc_id=doc_id,
            )
        )
        db.commit()
    _dispatch(_run_index, doc_id, task_id)
    return task_id


def _dispatch(fn, *args) -> None:
    if settings.task_mode == "thread":
        threading.Thread(target=fn, args=args, daemon=True).start()
    else:
        # 同步执行（降级 / 测试）
        fn(*args)


def _set_task(db, task_id: str, **fields) -> None:
    task = db.get(Task, task_id)
    if task:
        for k, v in fields.items():
            setattr(task, k, v)
        db.commit()


def _run_index(doc_id: int, task_id: str) -> None:
    db = SessionLocal()
    try:
        doc = db.get(Document, doc_id)
        if not doc:
            _set_task(db, task_id, state="FAILURE", message="文档不存在")
            return

        doc.status = "indexing"
        doc.progress = 5
        _set_task(db, task_id, state="STARTED", progress=5)
        db.commit()

        # 清理旧分块（覆盖重建场景）
        db.query(Chunk).filter(Chunk.doc_id == doc_id).delete()
        db.commit()
        try:
            es_client.delete_by_doc(doc_id)
        except Exception:  # noqa: BLE001
            logger.warning("清理旧 ES 分块失败 doc_id=%s", doc_id, exc_info=True)

        # 解析
        pages = extract_pages(doc.file_path, doc.file_type)
        doc.progress = 30
        _set_task(db, task_id, state="PROGRESS", progress=30)
        db.commit()

        # 切分
        raw_chunks = split_pages(pages, doc.file_type)
        doc.progress = 55
        _set_task(db, task_id, progress=55)
        db.commit()

        tags = list(doc.permission_tags or [])
        es_docs: list[dict] = []
        for rc in raw_chunks:
            cid = f"{doc_id}_{rc['chunk_index']}"
            content = rc["content"]
            db.add(
                Chunk(
                    id=cid,
                    doc_id=doc_id,
                    kb_id=doc.kb_id,
                    chunk_index=rc["chunk_index"],
                    title_path=rc["title_path"],
                    content=content,
                    source_page=rc["source_page"],
                    permission_tags=tags,
                    vector_id=cid,
                )
            )
            es_docs.append(
                {
                    "chunk_id": cid,
                    "content": content,
                    "embedding": embed_text(content),
                    "kb_id": str(doc.kb_id),
                    "doc_id": str(doc_id),
                    "chunk_index": rc["chunk_index"],
                    "title_path": rc["title_path"],
                    "doc_title": doc.title,
                    "permission_tags": tags,
                    "source_page": rc["source_page"],
                }
            )
        db.commit()
        doc.progress = 80
        _set_task(db, task_id, progress=80)
        db.commit()

        # 写入 ES（不可用则降级为仅入库）
        note = ""
        if es_docs:
            try:
                es_client.index_chunks(es_docs)
            except Exception as e:  # noqa: BLE001
                logger.warning("ES 索引失败，降级为仅入库: %s", e)
                note = "（ES 不可用，已降级为仅入库，未建向量索引）"

        doc.chunk_count = len(raw_chunks)
        doc.status = "ready"
        doc.progress = 100
        db.commit()
        _set_task(
            db,
            task_id,
            state="SUCCESS",
            progress=100,
            message=f"索引完成，共 {len(raw_chunks)} 个分块{note}",
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("文档索引失败 doc_id=%s", doc_id)
        db.rollback()
        try:
            doc = db.get(Document, doc_id)
            if doc:
                doc.status = "failed"
                doc.progress = 0
                db.commit()
        except Exception:  # noqa: BLE001
            db.rollback()
        _set_task(db, task_id, state="FAILURE", message=str(e)[:500])
    finally:
        db.close()
