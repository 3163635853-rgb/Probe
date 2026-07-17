import uuid as uuid_lib
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from config import settings
from db.mysql import get_db
from models.career import ExperienceStory, Resume
from services.resume_parser import SUPPORTED_RESUME_TYPES, extract_resume_text, parse_resume_text, stories_from_resume

router = APIRouter(prefix="/api/career", tags=["career"])
MAX_RESUME_SIZE = 10 * 1024 * 1024
RESUME_DIR = Path(settings.UPLOAD_STORAGE_DIR) / "resumes"

COMPANY_PRESETS = [
    {"name": "互联网大厂", "focus": ["业务理解", "数据分析", "跨团队影响力", "抗压"]},
    {"name": "创业公司", "focus": ["从零到一", "执行力", "资源有限下决策", "多角色协作"]},
    {"name": "外企", "focus": ["结构化表达", "英文沟通", "价值观", "跨文化协作"]},
    {"name": "国企/事业单位", "focus": ["稳定性", "组织协同", "责任意识", "政策理解"]},
    {"name": "咨询/专业服务", "focus": ["Case 分析", "逻辑拆解", "商业判断", "客户沟通"]},
]
INTERVIEW_STAGES = [
    {"code": "hr_screen", "name": "HR 初筛", "focus": "动机、稳定性、薪资和基础匹配"},
    {"code": "business_first", "name": "业务一面", "focus": "岗位基础能力和真实经历"},
    {"code": "business_second", "name": "业务二面", "focus": "复杂问题、深度和跨团队影响"},
    {"code": "manager", "name": "主管面", "focus": "判断力、潜力和团队匹配"},
    {"code": "director", "name": "总监面", "focus": "业务视角、战略和组织影响"},
    {"code": "final", "name": "终面", "focus": "综合匹配、价值观和关键风险"},
    {"code": "case", "name": "Case 面", "focus": "结构化分析、假设和数据推导"},
    {"code": "group", "name": "群面", "focus": "协作、推动、倾听和冲突处理"},
    {"code": "english", "name": "英文面", "focus": "英文表达、专业词汇和沟通清晰度"},
]
INTERVIEWER_ROLES = ["HR", "招聘经理", "直属主管", "业务负责人", "总监", "创始人", "交叉面试官", "客户代表"]


class StoryRequest(BaseModel):
    title: str = Field(min_length=1, max_length=128)
    situation: Optional[str] = None
    task: Optional[str] = None
    action: Optional[str] = None
    result: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    metrics: dict = Field(default_factory=dict)
    is_favorite: bool = False


def serialize_resume(item: Resume, include_text: bool = False) -> dict:
    data = {
        "uuid": item.uuid,
        "name": item.name,
        "file_type": item.file_type,
        "parsed": item.parsed_json or {},
        "is_active": item.is_active,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }
    if include_text:
        data["raw_text"] = item.raw_text
    return data


def analyze_story(item: ExperienceStory) -> dict:
    issues: list[str] = []
    situation = (item.situation or "").strip()
    task = (item.task or "").strip()
    action = (item.action or "").strip()
    result = (item.result or "").strip()
    if len(situation) > 300:
        issues.append("Situation 偏长，建议压缩背景")
    if not task:
        issues.append("Task 不够明确")
    if not action:
        issues.append("缺少具体 Action")
    elif not any(token in action for token in ("我", "负责", "主导", "推动", "设计", "完成")):
        issues.append("Action 需要更突出你的个人贡献")
    if not result:
        issues.append("缺少 Result")
    elif not any(char.isdigit() for char in result):
        issues.append("Result 建议补充量化结果")
    completed = sum(bool(value) for value in (situation, task, action, result))
    return {"score": max(0, min(100, completed * 20 + (20 if not issues else max(0, 20 - len(issues) * 5)))), "issues": issues, "complete": completed == 4 and not issues}


def serialize_story(item: ExperienceStory) -> dict:
    return {
        "uuid": item.uuid,
        "title": item.title,
        "situation": item.situation,
        "task": item.task,
        "action": item.action,
        "result": item.result,
        "tags": item.tags or [],
        "metrics": item.metrics or {},
        "is_favorite": item.is_favorite,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
        "quality": analyze_story(item),
    }


@router.get("/presets")
async def career_presets():
    return {"code": 0, "data": {"companies": COMPANY_PRESETS, "stages": INTERVIEW_STAGES, "interviewer_roles": INTERVIEWER_ROLES}}


@router.get("/resumes")
async def list_resumes(auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(Resume).where(Resume.user_id == user.id).order_by(desc(Resume.created_at)))
    return {"code": 0, "data": [serialize_resume(item) for item in result.scalars().all()]}


@router.get("/resumes/{resume_uuid}")
async def get_resume(resume_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(Resume).where(Resume.uuid == resume_uuid, Resume.user_id == user.id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail={"code": 40420, "message": "简历不存在"})
    return {"code": 0, "data": serialize_resume(item, include_text=True)}


@router.post("/resumes")
async def upload_resume(
    file: UploadFile = File(...),
    create_stories: bool = Query(True),
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if extension not in SUPPORTED_RESUME_TYPES:
        raise HTTPException(status_code=400, detail={"code": 40020, "message": "仅支持 PDF、DOCX、TXT 和 Markdown 简历"})
    content = await file.read()
    if not content or len(content) > MAX_RESUME_SIZE:
        raise HTTPException(status_code=400, detail={"code": 40021, "message": "简历文件不能为空且不能超过 10MB"})
    try:
        text = extract_resume_text(content, extension).strip()
    except Exception as exc:
        raise HTTPException(status_code=400, detail={"code": 40022, "message": "简历解析失败"}) from exc
    if len(text) < 30:
        raise HTTPException(status_code=400, detail={"code": 40023, "message": "简历文本过少，可能是扫描件；请上传可复制文字的版本"})
    parsed = parse_resume_text(text)
    resume_uuid = str(uuid_lib.uuid4())
    RESUME_DIR.mkdir(parents=True, exist_ok=True)
    path = RESUME_DIR / f"{resume_uuid}.{extension}"
    path.write_bytes(content)
    await db.execute(update(Resume).where(Resume.user_id == user.id).values(is_active=False))
    item = Resume(
        uuid=resume_uuid, user_id=user.id, name=(file.filename or "我的简历")[:128],
        file_path=str(path), file_type=extension, raw_text=text[:100000], parsed_json=parsed, is_active=True,
    )
    db.add(item)
    await db.flush()
    created_story_count = 0
    if create_stories:
        for story in stories_from_resume(parsed, item.id):
            db.add(ExperienceStory(uuid=str(uuid_lib.uuid4()), user_id=user.id, source_resume_id=item.id, **story))
            created_story_count += 1
    await db.commit()
    await db.refresh(item)
    return {"code": 0, "data": {**serialize_resume(item), "created_story_count": created_story_count}}


@router.put("/resumes/{resume_uuid}/activate")
async def activate_resume(resume_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(Resume).where(Resume.uuid == resume_uuid, Resume.user_id == user.id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail={"code": 40420, "message": "简历不存在"})
    await db.execute(update(Resume).where(Resume.user_id == user.id).values(is_active=False))
    item.is_active = True
    await db.commit()
    return {"code": 0, "data": {"activated": True}}


@router.delete("/resumes/{resume_uuid}")
async def delete_resume(resume_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(Resume).where(Resume.uuid == resume_uuid, Resume.user_id == user.id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail={"code": 40420, "message": "简历不存在"})
    path = Path(item.file_path) if item.file_path else None
    await db.execute(update(ExperienceStory).where(ExperienceStory.source_resume_id == item.id).values(source_resume_id=None))
    await db.delete(item)
    await db.commit()
    if path:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass
    return {"code": 0, "data": {"deleted": True}}


@router.get("/stories")
async def list_stories(auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(ExperienceStory).where(ExperienceStory.user_id == user.id).order_by(desc(ExperienceStory.is_favorite), desc(ExperienceStory.updated_at)))
    return {"code": 0, "data": [serialize_story(item) for item in result.scalars().all()]}


@router.post("/stories")
async def create_story(req: StoryRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    item = ExperienceStory(uuid=str(uuid_lib.uuid4()), user_id=user.id, **req.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"code": 0, "data": serialize_story(item)}


@router.put("/stories/{story_uuid}")
async def update_story(story_uuid: str, req: StoryRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(ExperienceStory).where(ExperienceStory.uuid == story_uuid, ExperienceStory.user_id == user.id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail={"code": 40421, "message": "经历素材不存在"})
    for key, value in req.model_dump().items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return {"code": 0, "data": serialize_story(item)}


@router.delete("/stories/{story_uuid}")
async def delete_story(story_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(ExperienceStory).where(ExperienceStory.uuid == story_uuid, ExperienceStory.user_id == user.id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail={"code": 40421, "message": "经历素材不存在"})
    await db.delete(item)
    await db.commit()
    return {"code": 0, "data": {"deleted": True}}


@router.get("/stories/recommend")
async def recommend_story(question: str = Query(..., min_length=2, max_length=1000), auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(ExperienceStory).where(ExperienceStory.user_id == user.id))
    stories = list(result.scalars().all())
    keywords = {
        "影响": ["影响力", "推动", "协作", "领导力"], "冲突": ["冲突", "协作", "沟通"],
        "失败": ["失败", "复盘"], "数据": ["数据分析", "量化成果", "增长"],
        "创新": ["创新", "从零到一"], "客户": ["客户", "投诉", "销售"],
        "压力": ["压力", "抗压", "时间压力"], "领导": ["领导力", "团队管理"],
    }
    wanted = {tag for token, tags in keywords.items() if token in question for tag in tags}
    ranked = []
    for item in stories:
        haystack = " ".join([item.title, item.situation or "", item.task or "", item.action or "", item.result or "", *(item.tags or [])])
        score = sum(3 for tag in wanted if tag in haystack) + sum(1 for token in question if token.strip() and token in haystack)
        if item.is_favorite:
            score += 2
        score += analyze_story(item)["score"] / 50
        ranked.append((score, item))
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    return {"code": 0, "data": [{**serialize_story(item), "match_score": round(score, 1)} for score, item in ranked[:3]]}
