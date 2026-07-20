import uuid as uuid_lib
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from db.mysql import get_db
from models.interview import InterviewSession
from models.organization import OrganizationMember, ScoringRubric, TechnicalSubmission
from services.technical import analyze_python_code, analyze_whiteboard, enhance_technical_feedback, execute_readonly_sql

router = APIRouter(prefix="/api/technical", tags=["technical"])

EXERCISES = [
    {"code": "python_review", "kind": "code", "title": "代码审查", "prompt": "审查一段 Python 数据处理函数，指出正确性、性能和可维护性问题。", "language": "python"},
    {"code": "sql_analysis", "kind": "sql", "title": "SQL 数据分析", "prompt": "查询每位用户已支付订单的总金额，并按金额降序排列。可用表 users、orders。", "language": "sql"},
    {"code": "system_design", "kind": "whiteboard", "title": "系统设计白板", "prompt": "设计一个支持高并发的面试流式对话系统，描述组件、数据流和降级方案。", "language": "json"},
    {"code": "debug", "kind": "debug", "title": "故障排查", "prompt": "服务 P99 延迟从 200ms 上升到 3s，请给出按优先级排列的排查方案。", "language": "text"},
    {"code": "architecture_compare", "kind": "debug", "title": "架构方案对比", "prompt": "比较消息队列异步处理与同步调用两种方案，从一致性、延迟、复杂度和故障恢复给出取舍。", "language": "text"},
]


class TechnicalRequest(BaseModel):
    kind: Literal["code", "sql", "whiteboard", "debug", "code_review"]
    prompt: str = Field(min_length=1, max_length=5000)
    content: str = Field(min_length=1, max_length=50000)
    language: str = Field("", max_length=32)
    session_uuid: str = ""
    rubric_uuid: str = ""


@router.get("/exercises")
async def list_exercises():
    return {"code": 0, "data": EXERCISES}


@router.post("/evaluate")
async def evaluate_submission(req: TechnicalRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    session_id = rubric_id = None
    rubric_dimensions = None
    if req.session_uuid:
        session_result = await db.execute(select(InterviewSession).where(InterviewSession.uuid == req.session_uuid, InterviewSession.user_id == user.id))
        session = session_result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail={"code": 40470, "message": "面试不存在"})
        session_id = session.id
    if req.rubric_uuid:
        rubric_result = await db.execute(select(ScoringRubric).where(ScoringRubric.uuid == req.rubric_uuid, ScoringRubric.is_active.is_(True)))
        rubric = rubric_result.scalar_one_or_none()
        if not rubric:
            raise HTTPException(status_code=403, detail={"code": 40370, "message": "评分标准不可用"})
        allowed = rubric.is_public or rubric.created_by == user.id
        if rubric.organization_id and not allowed:
            member_result = await db.execute(select(OrganizationMember.id).where(
                OrganizationMember.organization_id == rubric.organization_id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.status == "active",
            ))
            allowed = member_result.scalar_one_or_none() is not None
        if not allowed:
            raise HTTPException(status_code=403, detail={"code": 40370, "message": "评分标准不可用"})
        rubric_id, rubric_dimensions = rubric.id, rubric.dimensions
    if req.kind == "sql":
        base = execute_readonly_sql(req.content)
    elif req.kind == "whiteboard":
        base = analyze_whiteboard(req.content)
    elif req.kind in {"code", "code_review"} and (req.language.lower() in {"python", "py"} or not req.language):
        base = analyze_python_code(req.content)
    else:
        base = {"valid": True, "score": 60, "note": "使用 AI 按排查结构和证据完整度评估"}
    result = await enhance_technical_feedback(req.kind, req.prompt, req.content, base, rubric_dimensions)
    item = TechnicalSubmission(uuid=str(uuid_lib.uuid4()), user_id=user.id, session_id=session_id, rubric_id=rubric_id, kind=req.kind, language=req.language, prompt=req.prompt, content=req.content, result_json=result, score=int(result.get("score", 0)), status="completed")
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"code": 0, "data": {"uuid": item.uuid, "score": item.score, "result": result}}


@router.get("/submissions")
async def list_submissions(auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(TechnicalSubmission).where(TechnicalSubmission.user_id == user.id).order_by(desc(TechnicalSubmission.created_at)).limit(100))
    return {"code": 0, "data": [{"uuid": item.uuid, "kind": item.kind, "language": item.language, "prompt": item.prompt, "score": item.score, "result": item.result_json or {}, "created_at": item.created_at.isoformat()} for item in result.scalars().all()]}
