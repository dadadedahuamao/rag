"""会话历史路由：严格用户隔离（管理员可见全部）。"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.response import ApiError, ok
from app.database import get_db
from app.deps import get_current_user
from app.models import Conversation, User
from app.serializers import conversation_to_dict
from app.services import access

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("")
def list_conversations(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    q = db.query(Conversation).order_by(Conversation.updated_at.desc())
    if not access.is_admin_user(user):
        q = q.filter(Conversation.user_id == user.id)
    return ok([conversation_to_dict(c) for c in q.all()])


@router.get("/{conv_id}")
def get_conversation(
    conv_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    conv = db.get(Conversation, conv_id)
    if not conv:
        raise ApiError("会话不存在", code=1, status_code=404)
    if conv.user_id != user.id and not access.is_admin_user(user):
        raise ApiError("无权访问该会话", code=1, status_code=403)
    return ok(conversation_to_dict(conv, include_messages=True))


@router.delete("/{conv_id}")
def delete_conversation(
    conv_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    conv = db.get(Conversation, conv_id)
    if not conv:
        raise ApiError("会话不存在", code=1, status_code=404)
    if conv.user_id != user.id and not access.is_admin_user(user):
        raise ApiError("无权删除该会话", code=1, status_code=403)
    db.delete(conv)
    db.commit()
    return ok(message="会话已删除")
