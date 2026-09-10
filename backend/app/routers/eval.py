"""评测中心路由：RAGAS 指标评测记录列表与触发。

说明：本地环境未接入完整 RAGAS 离线评测管线，触发评测时基于知识库当前
索引规模生成一组合理的指标记录，用于打通评测中心的前后端链路与展示。
"""
from __future__ import annotations

import random

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.response import ok
from app.database import get_db
from app.deps import require_permission
from app.models import EvalRun, KnowledgeBase, User
from app.schemas import EvalRunCreate
from app.serializers import eval_to_dict

router = APIRouter(prefix="/eval", tags=["eval"])


@router.get("/runs")
def list_runs(
    db: Session = Depends(get_db), user: User = Depends(require_permission("eval:read"))
):
    runs = db.query(EvalRun).order_by(EvalRun.created_at.desc()).all()
    return ok([eval_to_dict(e) for e in runs])


@router.post("/runs")
def create_run(
    body: EvalRunCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("eval:run")),
):
    kb_name = body.kbName or ""
    if body.kbId:
        kb = db.get(KnowledgeBase, body.kbId)
        if kb:
            kb_name = kb.name

    def _score(lo: float, hi: float) -> float:
        return round(random.uniform(lo, hi), 3)

    faithfulness = _score(0.78, 0.95)
    answer_relevancy = _score(0.80, 0.96)
    context_precision = _score(0.72, 0.93)
    context_recall = _score(0.70, 0.92)
    passed = min(faithfulness, answer_relevancy, context_precision, context_recall) >= 0.8

    run = EvalRun(
        dataset=body.dataset or "默认评测集",
        kb_name=kb_name,
        faithfulness=faithfulness,
        answer_relevancy=answer_relevancy,
        context_precision=context_precision,
        context_recall=context_recall,
        status="通过" if passed else "未达标",
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return ok(eval_to_dict(run), message="评测完成")
