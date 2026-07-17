import re
import uuid as uuid_lib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from db.mysql import get_db
from models.interview import InterviewSession
from models.organization import Organization, OrganizationAuditLog, OrganizationMember, OrganizationQuestion, ScoringRubric
from models.user import User

router = APIRouter(prefix="/api/enterprise", tags=["enterprise"])


class OrganizationRequest(BaseModel):
    name: str = Field(min_length=2, max_length=128)
    slug: str = Field(min_length=2, max_length=64)


class MemberRequest(BaseModel):
    email: str
    role: str = "member"


class RubricRequest(BaseModel):
    name: str = Field(min_length=2, max_length=128)
    description: str = ""
    dimensions: list[dict]
    pass_score: int = Field(70, ge=0, le=100)
    organization_uuid: str = ""
    is_public: bool = False


class OrganizationSettingsRequest(BaseModel):
    retention_days: int = Field(365, ge=30, le=3650)
    sso_enabled: bool = False
    sso_provider: str = Field("", max_length=32)
    sso_domain: str = Field("", max_length=128)
    allow_member_export: bool = False


class MemberUpdateRequest(BaseModel):
    role: str = "member"
    status: str = "active"


class QuestionRequest(BaseModel):
    title: str = Field(min_length=2, max_length=128)
    question: str = Field(min_length=5, max_length=5000)
    dimension: str = Field("", max_length=64)
    difficulty: int = Field(3, ge=1, le=5)
    scoring_criteria: str = Field("", max_length=5000)


def serialize_org(item: Organization, role: str) -> dict:
    return {"uuid": item.uuid, "name": item.name, "slug": item.slug, "role": role, "settings": item.settings or {}, "created_at": item.created_at.isoformat()}


def serialize_rubric(item: ScoringRubric) -> dict:
    return {"uuid": item.uuid, "name": item.name, "description": item.description or "", "dimensions": item.dimensions, "pass_score": item.pass_score, "organization_id": item.organization_id, "is_public": item.is_public, "is_active": item.is_active, "created_at": item.created_at.isoformat()}


async def audit(db: AsyncSession, organization_id: int, actor_user_id: int, action: str, target_type: str = "", target_id: str = "", detail: dict | None = None) -> None:
    db.add(OrganizationAuditLog(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=action[:64],
        target_type=target_type[:32] or None,
        target_id=target_id[:64] or None,
        detail=detail or {},
    ))


async def membership(db: AsyncSession, user_id: int, org_uuid: str, allowed_roles: set[str] | None = None) -> tuple[Organization, OrganizationMember]:
    result = await db.execute(
        select(Organization, OrganizationMember)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(Organization.uuid == org_uuid, OrganizationMember.user_id == user_id, OrganizationMember.status == "active")
    )
    row = result.first()
    if not row or (allowed_roles and row[1].role not in allowed_roles):
        raise HTTPException(status_code=403, detail={"code": 40350, "message": "没有组织权限"})
    return row[0], row[1]


@router.get("/organizations")
async def list_organizations(auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(
        select(Organization, OrganizationMember)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(OrganizationMember.user_id == user.id, OrganizationMember.status == "active")
        .order_by(desc(Organization.created_at))
    )
    return {"code": 0, "data": [serialize_org(org, member.role) for org, member in result.all()]}


@router.post("/organizations")
async def create_organization(req: OrganizationRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    slug = re.sub(r"[^a-z0-9-]", "-", req.slug.lower()).strip("-")
    if len(slug) < 2:
        raise HTTPException(status_code=422, detail={"code": 42250, "message": "组织标识格式无效"})
    exists = await db.execute(select(Organization.id).where(Organization.slug == slug))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail={"code": 40950, "message": "组织标识已存在"})
    org = Organization(uuid=str(uuid_lib.uuid4()), name=req.name, slug=slug, owner_user_id=user.id, settings={})
    db.add(org)
    await db.flush()
    db.add(OrganizationMember(organization_id=org.id, user_id=user.id, role="owner", status="active"))
    await audit(db, org.id, user.id, "organization.created", "organization", org.uuid, {"name": org.name})
    await db.commit()
    await db.refresh(org)
    return {"code": 0, "data": serialize_org(org, "owner")}


@router.get("/organizations/{org_uuid}/members")
async def list_members(org_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    org, _ = await membership(db, user.id, org_uuid)
    result = await db.execute(
        select(OrganizationMember, User).join(User, User.id == OrganizationMember.user_id).where(OrganizationMember.organization_id == org.id)
    )
    return {"code": 0, "data": [{"uuid": member.id, "user_uuid": member_user.uuid, "nickname": member_user.nickname, "email": member_user.email, "role": member.role, "status": member.status} for member, member_user in result.all()]}


@router.post("/organizations/{org_uuid}/members")
async def add_member(org_uuid: str, req: MemberRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    org, _ = await membership(db, user.id, org_uuid, {"owner", "admin"})
    target_result = await db.execute(select(User).where(User.email == req.email))
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail={"code": 40450, "message": "该邮箱尚未注册 Probe"})
    member_result = await db.execute(select(OrganizationMember).where(OrganizationMember.organization_id == org.id, OrganizationMember.user_id == target.id))
    member = member_result.scalar_one_or_none()
    role = req.role if req.role in {"admin", "coach", "member"} else "member"
    if member:
        member.role, member.status = role, "active"
    else:
        db.add(OrganizationMember(organization_id=org.id, user_id=target.id, role=role, status="active"))
    await audit(db, org.id, user.id, "member.upserted", "user", target.uuid, {"role": role})
    await db.commit()
    return {"code": 0, "data": {"added": True, "user_uuid": target.uuid, "role": role}}


@router.post("/rubrics")
async def create_rubric(req: RubricRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    org_id = None
    if req.organization_uuid:
        org, _ = await membership(db, user.id, req.organization_uuid, {"owner", "admin", "coach"})
        org_id = org.id
    dimensions = []
    total_weight = 0.0
    for item in req.dimensions[:12]:
        if not isinstance(item, dict) or not item.get("name"):
            continue
        weight = max(0.0, float(item.get("weight", 0)))
        total_weight += weight
        dimensions.append({"name": str(item["name"])[:64], "weight": weight, "description": str(item.get("description") or "")[:500]})
    if not dimensions or total_weight <= 0:
        raise HTTPException(status_code=422, detail={"code": 42251, "message": "评分维度不能为空且权重必须大于 0"})
    for item in dimensions:
        item["weight"] = round(item["weight"] / total_weight, 4)
    rubric = ScoringRubric(uuid=str(uuid_lib.uuid4()), organization_id=org_id, created_by=user.id, name=req.name, description=req.description, dimensions=dimensions, pass_score=req.pass_score, is_public=req.is_public, is_active=True)
    db.add(rubric)
    await db.flush()
    if org_id:
        await audit(db, org_id, user.id, "rubric.created", "rubric", rubric.uuid, {"name": rubric.name})
    await db.commit()
    await db.refresh(rubric)
    return {"code": 0, "data": serialize_rubric(rubric)}


@router.get("/rubrics")
async def list_rubrics(organization_uuid: str = "", auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    conditions = [ScoringRubric.is_active.is_(True)]
    if organization_uuid:
        org, _ = await membership(db, user.id, organization_uuid)
        conditions.append(ScoringRubric.organization_id == org.id)
    else:
        conditions.append((ScoringRubric.created_by == user.id) | (ScoringRubric.is_public.is_(True)))
    result = await db.execute(select(ScoringRubric).where(*conditions).order_by(desc(ScoringRubric.updated_at)))
    return {"code": 0, "data": [serialize_rubric(item) for item in result.scalars().all()]}


@router.get("/organizations/{org_uuid}/dashboard")
async def organization_dashboard(org_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    org, _ = await membership(db, user.id, org_uuid, {"owner", "admin", "coach"})
    member_result = await db.execute(select(OrganizationMember.user_id).where(OrganizationMember.organization_id == org.id, OrganizationMember.status == "active"))
    member_ids = [row[0] for row in member_result.all()]
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=90)
    sessions_result = await db.execute(
        select(InterviewSession).where(InterviewSession.user_id.in_(member_ids), InterviewSession.status == "completed", InterviewSession.ended_at >= since)
    ) if member_ids else None
    sessions = list(sessions_result.scalars().all()) if sessions_result else []
    user_result = await db.execute(select(User).where(User.id.in_(member_ids))) if member_ids else None
    user_map = {item.id: item for item in user_result.scalars().all()} if user_result else {}
    by_user: dict[int, list[int]] = {}
    dimensions: dict[str, list[float]] = {}
    trend_map: dict[str, list[int]] = {}
    for session in sessions:
        score = int(session.final_score or 0)
        by_user.setdefault(session.user_id, []).append(score)
        day = (session.ended_at or session.started_at).date().isoformat()
        trend_map.setdefault(day, []).append(score)
        report_dimensions = (session.report_json or {}).get("dimensions", {}) if isinstance(session.report_json, dict) else {}
        for name, score in report_dimensions.items():
            try:
                dimensions.setdefault(str(name), []).append(float(score))
            except (TypeError, ValueError):
                continue
    members = [{"user_uuid": user_map[user_id].uuid, "nickname": user_map[user_id].nickname, "interviews": len(scores), "average_score": round(sum(scores) / len(scores))} for user_id, scores in by_user.items() if user_id in user_map]
    trend = [{"date": day, "interviews": len(scores), "average_score": round(sum(scores) / len(scores), 1)} for day, scores in sorted(trend_map.items())]
    return {"code": 0, "data": {"organization": serialize_org(org, "admin"), "member_count": len(member_ids), "completed_interviews": len(sessions), "average_score": round(sum(int(item.final_score or 0) for item in sessions) / max(1, len(sessions))), "dimensions": [{"name": name, "average": round(sum(scores) / len(scores), 1)} for name, scores in dimensions.items()], "trend": trend, "members": sorted(members, key=lambda item: item["average_score"], reverse=True)}}


@router.put("/organizations/{org_uuid}/settings")
async def update_organization_settings(org_uuid: str, req: OrganizationSettingsRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    org, _ = await membership(db, user.id, org_uuid, {"owner", "admin"})
    org.settings = {**(org.settings or {}), **req.model_dump()}
    await audit(db, org.id, user.id, "organization.settings_updated", "organization", org.uuid, req.model_dump())
    await db.commit()
    await db.refresh(org)
    return {"code": 0, "data": serialize_org(org, "admin")}


@router.put("/organizations/{org_uuid}/members/{user_uuid}")
async def update_member(org_uuid: str, user_uuid: str, req: MemberUpdateRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    org, _ = await membership(db, user.id, org_uuid, {"owner", "admin"})
    target_result = await db.execute(select(User).where(User.uuid == user_uuid))
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail={"code": 40450, "message": "成员不存在"})
    member_result = await db.execute(select(OrganizationMember).where(OrganizationMember.organization_id == org.id, OrganizationMember.user_id == target.id))
    member = member_result.scalar_one_or_none()
    if not member or member.role == "owner":
        raise HTTPException(status_code=403, detail={"code": 40351, "message": "不能修改该成员"})
    member.role = req.role if req.role in {"admin", "coach", "member"} else "member"
    member.status = req.status if req.status in {"active", "disabled"} else "active"
    await audit(db, org.id, user.id, "member.updated", "user", target.uuid, {"role": member.role, "status": member.status})
    await db.commit()
    return {"code": 0, "data": {"updated": True, "role": member.role, "status": member.status}}


@router.get("/organizations/{org_uuid}/questions")
async def list_questions(org_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    org, _ = await membership(db, user.id, org_uuid)
    result = await db.execute(select(OrganizationQuestion).where(OrganizationQuestion.organization_id == org.id, OrganizationQuestion.is_active.is_(True)).order_by(desc(OrganizationQuestion.updated_at)))
    return {"code": 0, "data": [{"uuid": item.uuid, "title": item.title, "question": item.question, "dimension": item.dimension or "", "difficulty": item.difficulty, "scoring_criteria": item.scoring_criteria or "", "created_at": item.created_at.isoformat()} for item in result.scalars().all()]}


@router.post("/organizations/{org_uuid}/questions")
async def create_question(org_uuid: str, req: QuestionRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    org, _ = await membership(db, user.id, org_uuid, {"owner", "admin", "coach"})
    item = OrganizationQuestion(uuid=str(uuid_lib.uuid4()), organization_id=org.id, created_by=user.id, title=req.title, question=req.question, dimension=req.dimension or None, difficulty=req.difficulty, scoring_criteria=req.scoring_criteria or None, is_active=True)
    db.add(item)
    await audit(db, org.id, user.id, "question.created", "question", item.uuid, {"title": item.title})
    await db.commit()
    await db.refresh(item)
    return {"code": 0, "data": {"uuid": item.uuid, **req.model_dump()}}


@router.get("/organizations/{org_uuid}/audit-logs")
async def list_audit_logs(org_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    org, _ = await membership(db, user.id, org_uuid, {"owner", "admin"})
    result = await db.execute(select(OrganizationAuditLog, User).join(User, User.id == OrganizationAuditLog.actor_user_id).where(OrganizationAuditLog.organization_id == org.id).order_by(desc(OrganizationAuditLog.created_at)).limit(200))
    return {"code": 0, "data": [{"id": item.id, "actor": actor.nickname, "action": item.action, "target_type": item.target_type, "target_id": item.target_id, "detail": item.detail or {}, "created_at": item.created_at.isoformat()} for item, actor in result.all()]}


@router.get("/organizations/{org_uuid}/export")
async def export_organization_data(org_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    org, _ = await membership(db, user.id, org_uuid, {"owner", "admin"})
    dashboard_response = await organization_dashboard(org_uuid, auth, db)
    members_response = await list_members(org_uuid, auth, db)
    questions_response = await list_questions(org_uuid, auth, db)
    await audit(db, org.id, user.id, "organization.exported", "organization", org.uuid)
    await db.commit()
    return {"code": 0, "data": {"exported_at": datetime.now(timezone.utc).isoformat(), "organization": serialize_org(org, "admin"), "dashboard": dashboard_response["data"], "members": members_response["data"], "questions": questions_response["data"]}}
