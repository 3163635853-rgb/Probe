from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from db.mysql import get_db
from models.config import Industry, Position, InterviewMode, DifficultyConfig

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/industries")
async def get_industries(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Industry).where(Industry.is_active.is_(True)).order_by(Industry.sort_order)
    )
    industries = result.scalars().all()
    return {
        "code": 0,
        "data": [
            {"id": i.id, "name": i.name, "icon": i.icon, "description": i.description}
            for i in industries
        ],
    }


@router.get("/positions")
async def get_positions(industry_id: int = Query(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Position)
        .where(Position.industry_id == industry_id, Position.is_active.is_(True))
        .order_by(Position.sort_order)
    )
    positions = result.scalars().all()
    return {
        "code": 0,
        "data": [
            {
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "level": p.level,
                "default_difficulty": p.default_difficulty,
            }
            for p in positions
        ],
    }


@router.get("/modes")
async def get_modes(category: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InterviewMode).where(InterviewMode.is_active.is_(True)).order_by(InterviewMode.sort_order)
    )
    modes = result.scalars().all()
    # Filter by category if specified
    if category:
        modes = [m for m in modes if m.applicable_categories and category in m.applicable_categories]
    return {
        "code": 0,
        "data": [
            {
                "code": m.code,
                "name": m.name,
                "description": m.description,
                "default_rounds": m.default_rounds,
                "default_duration_min": m.default_duration_min,
            }
            for m in modes
        ],
    }


@router.get("/difficulties")
async def get_difficulties(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DifficultyConfig).order_by(DifficultyConfig.level))
    diffs = result.scalars().all()
    return {
        "code": 0,
        "data": [
            {"level": d.level, "name": d.name, "description": d.description}
            for d in diffs
        ],
    }
