"""概览 Dashboard 路由：聚合统计指标、最近会话、进行中任务、最近评测。"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.common.response import ok
from app.database import get_db
from app.deps import get_current_user
from app.models import Conversation, Document, EvalRun, KnowledgeBase, Task, User
from app.serializers import conversation_to_dict, eval_to_dict, task_to_dict
from app.services import access, redis_client

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    allowed = set(access.accessible_kb_ids(db, user))
    is_admin = access.is_admin_user(user)

    total_kbs = (
        db.query(func.count(KnowledgeBase.id)).scalar()
        if is_admin
        else len(allowed)
    )

    doc_q = db.query(Document)
    if not is_admin:
        doc_q = doc_q.filter(Document.kb_id.in_(allowed or [0]))
    docs = doc_q.all()
    total_docs = len(docs)
    ready_docs = sum(1 for d in docs if d.status == "ready")
    failed_docs = sum(1 for d in docs if d.status == "failed")

    # 最近会话（管理员看全部，其他人看自己的）
    conv_q = db.query(Conversation).order_by(Conversation.updated_at.desc())
    if not is_admin:
        conv_q = conv_q.filter(Conversation.user_id == user.id)
    recent_convs = [conversation_to_dict(c) for c in conv_q.limit(5).all()]

    # 进行中的任务
    running = (
        db.query(Task)
        .filter(Task.state.in_(["PENDING", "STARTED", "PROGRESS"]))
        .order_by(Task.created_at.desc())
        .limit(10)
        .all()
    )
    running_tasks = [task_to_dict(t) for t in running]

    # 最近一次评测
    latest_eval = db.query(EvalRun).order_by(EvalRun.created_at.desc()).first()
    latest_eval_dict = eval_to_dict(latest_eval) if latest_eval else None

    metrics = redis_client.get_qa_metrics()

    return ok(
        {
            "totalKbs": int(total_kbs or 0),
            "totalDocs": total_docs,
            "readyDocs": ready_docs,
            "failedDocs": failed_docs,
            "todayQAs": metrics["todayQAs"],
            "cacheHitRate": metrics["cacheHitRate"],
            "recentConversations": recent_convs,
            "runningTasks": running_tasks,
            "latestEval": latest_eval_dict,
        }
    )
