"""FastAPI 依赖：当前用户解析、RBAC 权限校验、客户端信息。"""
from __future__ import annotations

import jwt
from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.common.response import ApiError
from app.database import get_db
from app.models import User
from app.security import decode_token
from app.serializers import merge_permissions


def get_client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else ""


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """从 Bearer Token 解析当前登录用户。"""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ApiError("未登录或缺少令牌", code=401, status_code=401)
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise ApiError("登录已过期，请重新登录", code=401, status_code=401)
    except jwt.PyJWTError:
        raise ApiError("无效的令牌", code=401, status_code=401)

    if payload.get("type") != "access":
        raise ApiError("令牌类型错误", code=401, status_code=401)

    user_id = int(payload.get("sub", 0))
    user = db.get(User, user_id)
    if not user:
        raise ApiError("用户不存在", code=401, status_code=401)
    if int(payload.get("ver", 0)) != user.token_version:
        raise ApiError("登录已失效，请重新登录", code=401, status_code=401)
    if user.status != "active":
        raise ApiError("该账号已被禁用", code=403, status_code=403)
    return user


def current_permissions(user: User) -> list[str]:
    return merge_permissions(list(user.roles))


def require_permission(permission: str):
    """生成一个校验指定权限的依赖。"""

    def checker(user: User = Depends(get_current_user)) -> User:
        perms = current_permissions(user)
        # admin 视为超级权限，放行一切
        if "admin" in perms or permission in perms:
            return user
        raise ApiError("权限不足", code=403, status_code=403)

    return checker


def is_admin(user: User) -> bool:
    return "admin" in current_permissions(user)
