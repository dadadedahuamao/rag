"""任务中心路由：任务列表 / 详情（进度轮询）/ 重试。"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.response import ApiError, ok
from app.database import get_db
from app.deps import get_current_user, require_permission
from app.models import Task, User
from app.serializers import task_to_dict
from app.services import indexing

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("")
def list_tasks(
    db: Session = Depends(get_db), user: User = Depends(require_permission("admin"))
):
    tasks = db.query(Task).order_by(Task.created_at.desc()).all()
    return ok([task_to_dict(t) for t in tasks])


@router.get("/{task_id}")
def get_task(
    task_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    """任务进度查询：供上传/重建后前端轮询，登录用户均可查询。"""
    task = db.get(Task, task_id)
    if not task:
        raise ApiError("任务不存在", code=1, status_code=404)
    return ok(task_to_dict(task))


@router.post("/{task_id}/retry")
def retry_task(
    task_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("admin")),
):
    task = db.get(Task, task_id)
    if not task:
        raise ApiError("任务不存在", code=1, status_code=404)
    if not task.doc_id:
        raise ApiError("该任务不支持重试", code=1, status_code=400)
    task.retry_count += 1
    task.state = "PENDING"
    task.progress = 0
    task.message = ""
    db.commit()
    new_task_id = indexing.create_index_task(
        task.doc_id, task_type=task.type, target=task.target
    )
    return ok({"taskId": new_task_id}, message="已重新提交任务")
