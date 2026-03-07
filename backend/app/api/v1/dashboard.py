from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.volunteer_record import VolunteerRecord
from app.schemas.dashboard import DashboardSummary

router = APIRouter()


@router.get("", response_model=DashboardSummary)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummary:
    result = await db.execute(select(VolunteerRecord).where(VolunteerRecord.user_id == current_user.id))
    records = list(result.scalars().all())

    completed = [item for item in records if item.status == "completed"]
    upcoming = [item for item in records if item.status == "signed_up"]
    total_hours = sum(float(item.hours_logged or 0) for item in completed)

    return DashboardSummary(
        upcoming_count=len(upcoming),
        completed_count=len(completed),
        total_hours=round(total_hours, 2),
    )
