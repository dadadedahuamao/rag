"""认证路由：登录 / 注册 / 刷新令牌 / 当前用户。"""
from __future__ import annotations

from datetime import datetime

import jwt
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.common.response import ApiError, ok
from app.database import get_db
from app.deps import get_client_ip, get_current_user
from app.models import Role, User
from app.schemas import LoginRequest, PasswordChangeRequest, RefreshRequest, RegisterRequest
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.serializers import user_to_dict
from app.services import audit

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_ROLE = "普通用户"


def _issue_tokens(user: User) -> dict:
    role_names = [r.name for r in user.roles]
    return {
        "token": create_access_token(user.id, role_names, user.token_version),
        "refreshToken": create_refresh_token(user.id, user.token_version),
        "user": user_to_dict(user),
    }


@router.post("/login")
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise ApiError("用户名或密码错误", code=1, status_code=401)
    if user.status != "active":
        raise ApiError("该账号已被禁用，请联系管理员", code=1, status_code=403)

    user.last_login = datetime.now()
    db.commit()
    audit.log(
        db,
        user_id=user.id,
        username=user.username,
        action="登录",
        resource="auth",
        ip=get_client_ip(request),
    )
    return ok(_issue_tokens(user), message="登录成功")


@router.post("/register")
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise ApiError("用户名已存在", code=1, status_code=409)

    user = User(
        username=body.username,
        email=body.email or "",
        password_hash=hash_password(body.password),
        status="active",
    )
    role = db.query(Role).filter(Role.name == DEFAULT_ROLE).first()
    if role:
        user.roles.append(role)
    db.add(user)
    db.commit()
    db.refresh(user)
    audit.log(
        db,
        user_id=user.id,
        username=user.username,
        action="注册",
        resource="auth",
        ip=get_client_ip(request),
    )
    return ok(_issue_tokens(user), message="注册成功")


@router.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refreshToken)
    except jwt.ExpiredSignatureError:
        raise ApiError("登录已过期，请重新登录", code=1, status_code=401)
    except jwt.PyJWTError:
        raise ApiError("无效的刷新令牌", code=1, status_code=401)
    if payload.get("type") != "refresh":
        raise ApiError("令牌类型错误", code=1, status_code=401)

    user = db.get(User, int(payload.get("sub", 0)))
    if not user or user.status != "active":
        raise ApiError("用户不可用", code=1, status_code=401)
    if int(payload.get("ver", 0)) != user.token_version:
        raise ApiError("登录已失效，请重新登录", code=401, status_code=401)
    role_names = [r.name for r in user.roles]
    return ok({"token": create_access_token(user.id, role_names, user.token_version)})


@router.put("/password")
def change_password(
    body: PasswordChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(body.currentPassword, user.password_hash):
        raise ApiError("当前密码错误", code=1, status_code=400)
    if verify_password(body.newPassword, user.password_hash):
        raise ApiError("新密码不能与当前密码相同", code=1, status_code=400)

    user.password_hash = hash_password(body.newPassword)
    user.token_version += 1
    db.commit()
    audit.log(
        db,
        user_id=user.id,
        username=user.username,
        action="修改密码",
        resource="auth",
        ip=get_client_ip(request),
    )
    return ok(None, message="密码修改成功，请重新登录")


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return ok(user_to_dict(user))
