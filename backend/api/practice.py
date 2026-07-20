import uuid as uuid_lib
from datetime import timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from agent.evaluator import evaluate
from api.deps import get_current_user
from db.mysql import get_db
from models.career import DrillAttempt, ExperienceStory, PracticeAttempt
from models.interview import InterviewRound, InterviewSession
from models.knowledge import KnowledgeQuestion
from services.llm import CHAT_PARAMS, chat
from services.practice import compare_answers, optimize_answer
from services.career_evidence import build_candidate_evidence

router = APIRouter(prefix="/api/practice", tags=["practice"])

DRILLS = [
    {"code": "self_intro", "name": "60 秒自我介绍", "duration_min": 3, "dimension": "逻辑表达", "prompt": "请用 60 秒介绍你自己，并说明为什么适合目标岗位。"},
    {"code": "star", "name": "STAR 行为题", "duration_min": 5, "dimension": "结构化表达", "prompt": "请讲一个你推动困难事项并取得结果的经历。"},
    {"code": "quantified", "name": "量化成果", "duration_min": 4, "dimension": "数据驱动", "prompt": "请选择一个项目，说明你的具体贡献和可量化结果。"},
    {"code": "pressure", "name": "压力追问", "duration_min": 5, "dimension": "抗压能力", "prompt": "我认为你刚才的方案并不能解决问题，你如何回应？"},
    {"code": "reverse_question", "name": "反问面试官", "duration_min": 3, "dimension": "岗位理解", "prompt": "面试接近结束，请向面试官提出三个高质量问题。"},
    {"code": "salary", "name": "薪资沟通", "duration_min": 4, "dimension": "沟通能力", "prompt": "你的期望薪资是多少？为什么？"},
    {"code": "gap", "name": "空窗期解释", "duration_min": 4, "dimension": "风险沟通", "prompt": "请解释你简历中的空窗期，以及期间做了什么准备。"},
    {"code": "failure", "name": "失败经历", "duration_min": 5, "dimension": "复盘能力", "prompt": "讲一个你没有达成目标的经历，你从中学到了什么？"},
    {"code": "leadership", "name": "领导力", "duration_min": 5, "dimension": "影响力", "prompt": "请讲一个你在没有正式权力时推动他人协作的经历。"},
    {"code": "case", "name": "Case 快练", "duration_min": 8, "dimension": "问题解决", "prompt": "某产品活跃用户连续三周下降 15%，请说明你的分析框架。"},
]


class RetryRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=10000)


class OptimizeRequest(BaseModel):
    question: str = Field(min_length=1, max_length=3000)
    answer: str = Field(min_length=1, max_length=10000)
    evaluation: dict = Field(default_factory=dict)


class DrillGenerateRequest(BaseModel):
    position: str = ""
    company_name: str = ""
    difficulty: int = Field(3, ge=1, le=5)
    focus: str = ""


class DrillAttemptRequest(BaseModel):
    question: str = Field(min_length=1, max_length=3000)
    answer: str = Field(min_length=1, max_length=10000)
    difficulty: int = Field(3, ge=1, le=5)
    duration_sec: int | None = Field(None, ge=0, le=3600)
    position: str = Field("", max_length=128)
    company_name: str = Field("", max_length=128)
    focus: str = Field("", max_length=128)


async def owned_round(db: AsyncSession, user_id: int, round_id: int) -> tuple[InterviewRound, InterviewSession]:
    result = await db.execute(
        select(InterviewRound, InterviewSession)
        .join(InterviewSession, InterviewSession.id == InterviewRound.session_id)
        .where(InterviewRound.id == round_id, InterviewSession.user_id == user_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail={"code": 40430, "message": "面试题不存在"})
    return row[0], row[1]


async def user_stories(db: AsyncSession, user_id: int) -> list[dict]:
    result = await db.execute(
        select(ExperienceStory).where(ExperienceStory.user_id == user_id).order_by(ExperienceStory.is_favorite.desc()).limit(8)
    )
    return [
        {"title": item.title, "situation": item.situation, "task": item.task, "action": item.action, "result": item.result, "tags": item.tags or []}
        for item in result.scalars().all()
    ]


@router.get("/drills")
async def list_drills():
    return {"code": 0, "data": DRILLS}


@router.post("/drills/{drill_code}/generate")
async def generate_drill(
    drill_code: str,
    req: DrillGenerateRequest,
    auth: tuple = Depends(get_current_user),
):
    drill = next((item for item in DRILLS if item["code"] == drill_code), None)
    if not drill:
        raise HTTPException(status_code=404, detail={"code": 40431, "message": "专项训练不存在"})
    prompt = f"""生成一道中文面试专项训练题，只输出题目，不要解释。
训练类型：{drill['name']}
基础题：{drill['prompt']}
目标岗位：{req.position or '通用岗位'}
目标公司：{req.company_name or '未指定'}
难度：{req.difficulty}/5
训练重点：{req.focus or drill['dimension']}"""
    try:
        question = (await chat([{"role": "user", "content": prompt}], CHAT_PARAMS)).strip()
    except Exception:
        question = drill["prompt"]
    return {"code": 0, "data": {**drill, "question": question}}


@router.post("/rounds/{round_id}/retry")
async def retry_round(
    round_id: int,
    req: RetryRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    round_item, session = await owned_round(db, user.id, round_id)
    reference_answer = scoring_criteria = ""
    if round_item.knowledge_question_id:
        knowledge = await db.get(KnowledgeQuestion, round_item.knowledge_question_id)
        if knowledge:
            reference_answer = knowledge.reference_answer or ""
            scoring_criteria = knowledge.scoring_criteria or ""
    candidate_evidence = await build_candidate_evidence(db, user_id=user.id, resume_id=session.resume_id)
    result = await evaluate(round_item.question, req.answer, session.difficulty, reference_answer, scoring_criteria, candidate_evidence)
    count_result = await db.execute(
        select(func.count()).select_from(PracticeAttempt).where(PracticeAttempt.user_id == user.id, PracticeAttempt.round_id == round_id)
    )
    attempt_no = int(count_result.scalar() or 0) + 1
    stories = await user_stories(db, user.id)
    optimized = await optimize_answer(round_item.question, req.answer, result, stories)
    comparison = compare_answers(round_item.answer or "", req.answer, int(round_item.score or 0), int(result.get("score", 0)), result)
    item = PracticeAttempt(
        uuid=str(uuid_lib.uuid4()), user_id=user.id, session_id=session.id, round_id=round_item.id,
        attempt_no=attempt_no, answer=req.answer, score=int(result.get("score", 0)), evaluation=result,
        optimized_answers=optimized, comparison=comparison,
    )
    db.add(item)
    await db.commit()
    return {"code": 0, "data": {"uuid": item.uuid, "attempt_no": attempt_no, "score": item.score, "evaluation": result, "optimized_answers": optimized, "comparison": comparison}}


@router.get("/rounds/{round_id}/attempts")
async def round_attempts(round_id: int, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    await owned_round(db, user.id, round_id)
    result = await db.execute(
        select(PracticeAttempt).where(PracticeAttempt.user_id == user.id, PracticeAttempt.round_id == round_id).order_by(PracticeAttempt.attempt_no)
    )
    return {"code": 0, "data": [
        {"uuid": item.uuid, "attempt_no": item.attempt_no, "answer": item.answer, "score": item.score, "evaluation": item.evaluation or {}, "optimized_answers": item.optimized_answers or {}, "comparison": item.comparison or {}, "created_at": item.created_at.isoformat()}
        for item in result.scalars().all()
    ]}


@router.post("/optimize")
async def optimize_standalone(req: OptimizeRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    stories = await user_stories(db, user.id)
    optimized = await optimize_answer(req.question, req.answer, req.evaluation, stories)
    return {"code": 0, "data": optimized}


@router.post("/drills/{drill_code}/attempts")
async def submit_drill_attempt(drill_code: str, req: DrillAttemptRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    drill = next((item for item in DRILLS if item["code"] == drill_code), None)
    if not drill:
        raise HTTPException(status_code=404, detail={"code": 40431, "message": "专项训练不存在"})
    candidate_evidence = await build_candidate_evidence(db, user_id=user.id)
    scoring = f"专项训练维度：{req.focus or drill['dimension']}。重点检查回答是否直接、结构完整、事实可信且有结果。"
    evaluation = await evaluate(req.question, req.answer, req.difficulty, scoring_criteria=scoring, candidate_evidence=candidate_evidence)
    stories = await user_stories(db, user.id)
    optimized = await optimize_answer(req.question, req.answer, evaluation, stories)
    previous_result = await db.execute(
        select(DrillAttempt).where(DrillAttempt.user_id == user.id, DrillAttempt.drill_code == drill_code).order_by(DrillAttempt.created_at.desc()).limit(1)
    )
    previous = previous_result.scalar_one_or_none()
    comparison = compare_answers(previous.answer if previous else "", req.answer, previous.score if previous else 0, int(evaluation.get("score", 0)), evaluation)

    from api.growth import complete_growth_task, ensure_daily_tasks, get_or_create_profile, local_today
    today = local_today()
    profile = await get_or_create_profile(db, user.id)
    tasks = await ensure_daily_tasks(db, user_id=user.id, today=today, focus_dimension=req.focus or drill["dimension"])
    xp_awarded = 0
    focus_task = next((task for task in tasks if task.task_type == "focus"), None)
    if focus_task and complete_growth_task(profile, focus_task, today):
        xp_awarded = focus_task.xp_reward

    item = DrillAttempt(
        uuid=str(uuid_lib.uuid4()), user_id=user.id, drill_code=drill_code,
        question=req.question, answer=req.answer, score=int(evaluation.get("score", 0)),
        duration_sec=req.duration_sec, position=req.position or None, company_name=req.company_name or None,
        focus=req.focus or drill["dimension"], evaluation=evaluation, optimized_answers=optimized,
        comparison=comparison, xp_awarded=xp_awarded,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"code": 0, "data": {"uuid": item.uuid, "drill_code": drill_code, "score": item.score, "evaluation": evaluation, "optimized_answers": optimized, "comparison": comparison, "xp_awarded": xp_awarded, "created_at": item.created_at.isoformat()}}


@router.get("/drills/attempts")
async def list_drill_attempts(drill_code: str = "", limit: int = 50, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    conditions = [DrillAttempt.user_id == user.id]
    if drill_code:
        conditions.append(DrillAttempt.drill_code == drill_code)
    result = await db.execute(select(DrillAttempt).where(*conditions).order_by(DrillAttempt.created_at.desc()).limit(max(1, min(100, limit))))
    return {"code": 0, "data": [{"uuid": item.uuid, "drill_code": item.drill_code, "question": item.question, "answer": item.answer, "score": item.score, "duration_sec": item.duration_sec, "focus": item.focus, "evaluation": item.evaluation or {}, "optimized_answers": item.optimized_answers or {}, "comparison": item.comparison or {}, "xp_awarded": item.xp_awarded, "created_at": item.created_at.isoformat()} for item in result.scalars().all()]}
