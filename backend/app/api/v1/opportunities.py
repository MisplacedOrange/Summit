from __future__ import annotations

import math
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_user, require_role
from app.models.opportunity import Opportunity
from app.models.organization import Organization
from app.models.user import User
from app.models.volunteer_record import SavedOpportunity, VolunteerRecord
from app.schemas.opportunity import OpportunityCreate, OpportunityListResponse, OpportunityMapPin, OpportunityRead

router = APIRouter()


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_km = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return earth_km * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


@router.get("", response_model=OpportunityListResponse)
async def list_opportunities(
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
    radius_km: int = Query(default=25, ge=1, le=250),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> OpportunityListResponse:
    filters = []
    if q:
        filters.append(or_(Opportunity.title.ilike(f"%{q}%"), Opportunity.description.ilike(f"%{q}%")))
    if category:
        filters.append(Opportunity.cause_category == category)
    if date_from:
        filters.append(Opportunity.event_date >= date_from)
    if date_to:
        filters.append(Opportunity.event_date <= date_to)

    stmt = select(Opportunity)
    count_stmt = select(func.count(Opportunity.id))
    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    stmt = stmt.order_by(Opportunity.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    if lat is not None and lng is not None:
        rows = [
            row
            for row in rows
            if row.location_lat is not None
            and row.location_lng is not None
            and _haversine_km(lat, lng, row.location_lat, row.location_lng) <= radius_km
        ]

    total = await db.scalar(count_stmt) or 0
    return OpportunityListResponse(total=int(total), items=rows)


@router.get("/map", response_model=list[OpportunityMapPin])
async def list_map_pins(db: AsyncSession = Depends(get_db)) -> list[OpportunityMapPin]:
    result = await db.execute(select(Opportunity))
    opportunities = result.scalars().all()
    return [
        OpportunityMapPin(
            id=item.id,
            title=item.title,
            cause_category=item.cause_category,
            location_lat=item.location_lat,
            location_lng=item.location_lng,
        )
        for item in opportunities
    ]


@router.get("/{opportunity_id}", response_model=OpportunityRead)
async def get_opportunity(opportunity_id: str, db: AsyncSession = Depends(get_db)) -> Opportunity:
    opportunity = await db.get(Opportunity, opportunity_id)
    if opportunity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return opportunity


@router.post("", response_model=OpportunityRead)
async def create_opportunity(
    payload: OpportunityCreate,
    org_user: User = Depends(require_role("organization")),
    db: AsyncSession = Depends(get_db),
) -> Opportunity:
    result = await db.execute(select(Organization).where(Organization.user_id == org_user.id))
    organization = result.scalar_one_or_none()
    if organization is None:
        organization = Organization(user_id=org_user.id, name=org_user.full_name or org_user.email)
        db.add(organization)
        await db.flush()

    opportunity = Opportunity(
        organization_id=organization.id,
        title=payload.title,
        description=payload.description,
        cause_category=payload.cause_category,
        location_text=payload.location_text,
        location_lat=payload.location_lat,
        location_lng=payload.location_lng,
        event_date=payload.event_date,
        event_time=payload.event_time,
        volunteers_needed=payload.volunteers_needed,
        skills_required=payload.skills_required,
        is_scraped=False,
    )
    db.add(opportunity)
    await db.commit()
    await db.refresh(opportunity)
    return opportunity


@router.post("/{opportunity_id}/join")
async def join_opportunity(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    opportunity = await db.get(Opportunity, opportunity_id)
    if opportunity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    existing = await db.execute(
        select(VolunteerRecord).where(
            VolunteerRecord.user_id == current_user.id,
            VolunteerRecord.opportunity_id == opportunity_id,
        )
    )
    if existing.scalar_one_or_none() is None:
        db.add(VolunteerRecord(user_id=current_user.id, opportunity_id=opportunity_id, status="signed_up"))
        opportunity.volunteers_signed = (opportunity.volunteers_signed or 0) + 1

    await db.commit()
    return {"status": "joined"}


@router.post("/{opportunity_id}/save")
async def save_opportunity(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    opportunity = await db.get(Opportunity, opportunity_id)
    if opportunity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    existing = await db.get(SavedOpportunity, {"user_id": current_user.id, "opportunity_id": opportunity_id})
    if existing is None:
        db.add(SavedOpportunity(user_id=current_user.id, opportunity_id=opportunity_id))
        await db.commit()

    return {"status": "saved"}
