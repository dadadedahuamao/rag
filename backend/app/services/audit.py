"""审计日志写入工具。写库失败不影响主流程。"""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models import AuditLog

logger = logging.getLogger("rag.audit")


def log(
    db: Session,
    *,
    user_id: int | None = None,
    username: str = "",
    action: str = "",
    resource: str = "",
    ip: str = "",
) -> None:
    try:
        db.add(
            AuditLog(
                user_id=user_id,
                username=username,
                action=action,
                resource=resource,
                ip=ip,
            )
        )
        db.commit()
    except Exception:  # noqa: BLE001
        db.rollback()
        logger.warning("写入审计日志失败", exc_info=True)
