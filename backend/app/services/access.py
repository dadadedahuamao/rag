"""知识库访问控制：基于可见性、归属与成员关系的权限判定。

- public / department：所有已登录用户可读；
- private：仅归属人、成员与管理员可读；
- 写/管理：管理员、归属人、write 级成员或具备 kb:manage 权限者。
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import KbMember, KnowledgeBase, User
from app.serializers import merge_permissions


def user_permissions(user: User) -> list[str]:
    return merge_permissions(list(user.roles))


def is_admin_user(user: User) -> bool:
    return "admin" in user_permissions(user)


def accessible_kb_ids(db: Session, user: User) -> list[int]:
    """返回当前用户可读的知识库 id 列表。"""
    if is_admin_user(user):
        return [k.id for k in db.query(KnowledgeBase).all()]
    ids: set[int] = set()
    for kb in db.query(KnowledgeBase).all():
        if kb.visibility in ("public", "department") or kb.owner_id == user.id:
            ids.add(kb.id)
    for m in db.query(KbMember).filter(KbMember.user_id == user.id).all():
        ids.add(m.kb_id)
    return sorted(ids)


def can_read_kb(db: Session, user: User, kb: KnowledgeBase) -> bool:
    if is_admin_user(user):
        return True
    if kb.visibility in ("public", "department") or kb.owner_id == user.id:
        return True
    m = (
        db.query(KbMember)
        .filter(KbMember.kb_id == kb.id, KbMember.user_id == user.id)
        .first()
    )
    return m is not None


def can_manage_kb(db: Session, user: User, kb: KnowledgeBase) -> bool:
    perms = user_permissions(user)
    if "admin" in perms:
        return True
    if kb.owner_id == user.id:
        return True
    m = (
        db.query(KbMember)
        .filter(KbMember.kb_id == kb.id, KbMember.user_id == user.id)
        .first()
    )
    return bool(m and m.access_level == "write")
