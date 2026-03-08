from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_user, require_role
from app.models.opportunity import Opportunity
from app.models.organization import Organization
from app.models.user import User
from app.models.volunteer_record import SavedOpportunity, VolunteerRecord
from app.schemas.opportunity import OpportunityCreate, OpportunityListResponse, OpportunityMapPin, OpportunityRead, HeatPoint
from app.services.location import haversine_km, validate_coordinates
from app.services.geocoding import geocode_address

router = APIRouter()


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

    stmt = select(Opportunity).options(selectinload(Opportunity.organization))
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
            and haversine_km(lat, lng, row.location_lat, row.location_lng) <= radius_km
        ]

    total = await db.scalar(count_stmt) or 0
    enriched = [
        OpportunityRead.model_validate(row).model_copy(
            update={"organization_name": row.organization.name if row.organization else None}
        )
        for row in rows
    ]
    return OpportunityListResponse(total=int(total), items=enriched)


@router.get("/map", response_model=list[OpportunityMapPin])
async def list_map_pins(
    lat: float | None = Query(default=None, description="Center latitude for viewport filter"),
    lng: float | None = Query(default=None, description="Center longitude for viewport filter"),
    radius_km: int = Query(default=50, ge=1, le=500, description="Radius in km from center"),
    db: AsyncSession = Depends(get_db),
) -> list[OpportunityMapPin]:
    """Return map pins for opportunities that have real geocoded coordinates."""
    stmt = select(Opportunity).where(
        Opportunity.location_lat.is_not(None),
        Opportunity.location_lng.is_not(None),
    )
    result = await db.execute(stmt)
    opportunities = list(result.scalars().all())

    # Optional viewport filter
    if lat is not None and lng is not None:
        opportunities = [
            item for item in opportunities
            if haversine_km(lat, lng, float(item.location_lat), float(item.location_lng)) <= radius_km
        ]

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


@router.get("/map/heat", response_model=list[HeatPoint])
async def list_heat_points(
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
    radius_km: int = Query(default=50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> list[HeatPoint]:
    """Return weighted heat-map points based on volunteer demand urgency."""
    stmt = select(Opportunity).where(
        Opportunity.location_lat.is_not(None),
        Opportunity.location_lng.is_not(None),
    )
    result = await db.execute(stmt)
    opportunities = list(result.scalars().all())

    if lat is not None and lng is not None:
        opportunities = [
            item for item in opportunities
            if haversine_km(lat, lng, float(item.location_lat), float(item.location_lng)) <= radius_km
        ]

    points: list[HeatPoint] = []
    for opp in opportunities:
        needed = opp.volunteers_needed or 1
        signed = opp.volunteers_signed or 0
        remaining = max(0, needed - signed)
        # Weight: normalized urgency (0.2 baseline so every point is visible)
        weight = min(1.0, 0.2 + (remaining / max(needed, 1)) * 0.8)
        points.append(HeatPoint(lat=float(opp.location_lat), lng=float(opp.location_lng), weight=round(weight, 3)))

    return points


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

    # If caller provided coords, mark them as manual; otherwise geocode from location_text.
    if validate_coordinates(payload.location_lat, payload.location_lng):
        opportunity.geocode_source = "manual"
        opportunity.geocode_confidence = 1.0
        opportunity.geocoded_at = datetime.now(timezone.utc)
    elif payload.location_text:
        result = await geocode_address(payload.location_text)
        if result.lat is not None and result.lng is not None:
            opportunity.location_lat = result.lat
            opportunity.location_lng = result.lng
            opportunity.geocode_source = result.source
            opportunity.geocode_confidence = result.confidence
            opportunity.geocoded_at = datetime.now(timezone.utc)

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


@router.put("/{opportunity_id}/image", response_model=OpportunityRead)
async def upload_opportunity_image(
    opportunity_id: str,
    file: UploadFile,
    org_user: User = Depends(require_role("organization")),
    db: AsyncSession = Depends(get_db),
) -> Opportunity:
    from app.services.cloudinary import upload_image

    opportunity = await db.get(Opportunity, opportunity_id)
    if opportunity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    result = await db.execute(select(Organization).where(Organization.user_id == org_user.id))
    org = result.scalar_one_or_none()
    if org is None or opportunity.organization_id != org.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your opportunity")

    url = await upload_image(file, folder="summit/opportunities")
    opportunity.image_url = url
    db.add(opportunity)
    await db.commit()
    await db.refresh(opportunity)
    return opportunity
