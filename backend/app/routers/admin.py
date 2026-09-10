"""管理路由：用户/角色管理、审计日志、系统配置。均需 admin 权限。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.common.response import ApiError, ok
from app.database import get_db
from app.deps import get_client_ip, require_permission
from app.models import AuditLog, Role, SystemConfig, User
from app.schemas import ConfigUpdate, RoleUpsert, UserCreate, UserUpdate
from app.security import hash_password
from app.serializers import audit_to_dict, role_to_dict, user_to_dict
from app.services import audit

router = APIRouter(prefix="/admin", tags=["admin"])

# 系统配置默认值（仅缓存与限流两组，模型/检索配置由后端代码固定）
DEFAULT_CONFIG = {
    "cache": {"ttlSeconds": 3600, "similarityThreshold": 0.95, "maxCacheSize": 10000},
    "rateLimit": {
        "userPerMinute": 30,
        "qaPerMinute": 60,
        "uploadPerMinute": 10,
        "llmConcurrency": 5,
    },
}


# ---------------- 用户管理 ----------------
@router.get("/users")
def list_users(
    db: Session = Depends(get_db), user: User = Depends(require_permission("admin"))
):
    users = db.query(User).order_by(User.id).all()
    return ok([user_to_dict(u) for u in users])


@router.post("/users")
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("admin")),
):
    if db.query(User).filter(User.username == body.username).first():
        raise ApiError("用户名已存在", code=1, status_code=409)
    new_user = User(
        username=body.username,
        email=body.email or "",
        password_hash=hash_password(body.password),
        status="active",
    )
    if body.roles:
        roles = db.query(Role).filter(Role.name.in_(body.roles)).all()
        new_user.roles = roles
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return ok(user_to_dict(new_user), message="用户已创建")


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("admin")),
):
    target = db.get(User, user_id)
    if not target:
        raise ApiError("用户不存在", code=1, status_code=404)
    if body.status is not None:
        target.status = body.status
    if body.roles is not None:
        target.roles = db.query(Role).filter(Role.name.in_(body.roles)).all()
    db.commit()
    db.refresh(target)
    return ok(user_to_dict(target), message="用户已更新")


# ---------------- 角色管理 ----------------
@router.get("/roles")
def list_roles(
    db: Session = Depends(get_db), user: User = Depends(require_permission("admin"))
):
    roles = db.query(Role).order_by(Role.id).all()
    return ok([role_to_dict(r) for r in roles])


@router.post("/roles")
def create_role(
    body: RoleUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("admin")),
):
    if not body.name:
        raise ApiError("角色名称不能为空", code=1, status_code=400)
    if db.query(Role).filter(Role.name == body.name).first():
        raise ApiError("角色名称已存在", code=1, status_code=409)
    role = Role(
        name=body.name,
        description=body.description or "",
        permissions=body.permissions or [],
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return ok(role_to_dict(role), message="角色已创建")


@router.put("/roles/{role_id}")
def update_role(
    role_id: int,
    body: RoleUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("admin")),
):
    role = db.get(Role, role_id)
    if not role:
        raise ApiError("角色不存在", code=1, status_code=404)
    if body.description is not None:
        role.description = body.description
    if body.permissions is not None:
        role.permissions = body.permissions
    db.commit()
    db.refresh(role)
    return ok(role_to_dict(role), message="角色已更新")


# ---------------- 审计日志 ----------------
@router.get("/audit-logs")
def list_audit_logs(
    keyword: str | None = None,
    limit: int = 500,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("admin")),
):
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if keyword:
        like = f"%{keyword}%"
        q = q.filter((AuditLog.username.like(like)) | (AuditLog.action.like(like)))
    logs = q.limit(min(limit, 2000)).all()
    return ok([audit_to_dict(a) for a in logs])


# ---------------- 系统配置 ----------------
def _get_config(db: Session) -> dict:
    row = db.get(SystemConfig, 1)
    if not row:
        row = SystemConfig(id=1, data=DEFAULT_CONFIG)
        db.add(row)
        db.commit()
        db.refresh(row)
    data = dict(row.data or {})
    # 补齐缺失分组，保证前端表单字段完整
    for key, val in DEFAULT_CONFIG.items():
        data.setdefault(key, val)
    return {"cache": data["cache"], "rateLimit": data["rateLimit"]}


@router.get("/config")
def get_config(
    db: Session = Depends(get_db), user: User = Depends(require_permission("admin"))
):
    return ok(_get_config(db))


@router.put("/config")
def update_config(
    body: ConfigUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("admin")),
):
    row = db.get(SystemConfig, 1)
    if not row:
        row = SystemConfig(id=1, data=DEFAULT_CONFIG)
        db.add(row)
    data = dict(row.data or DEFAULT_CONFIG)
    if body.cache is not None:
        data["cache"] = {**data.get("cache", {}), **body.cache}
    if body.rateLimit is not None:
        data["rateLimit"] = {**data.get("rateLimit", {}), **body.rateLimit}
    row.data = data
    db.commit()
    audit.log(
        db,
        user_id=user.id,
        username=user.username,
        action="更新系统配置",
        resource="config",
        ip=get_client_ip(request),
    )
    return ok(_get_config(db), message="系统配置已保存")
