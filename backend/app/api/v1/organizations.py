from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import require_role
from app.models.opportunity import Opportunity
from app.models.organization import Organization
from app.models.user import User
from app.schemas.opportunity import OpportunityRead
from app.schemas.organization import OrganizationRead, OrganizationUpdate

router = APIRouter()


@router.get("/{organization_id}", response_model=OrganizationRead)
async def get_organization(organization_id: str, db: AsyncSession = Depends(get_db)) -> Organization:
    organization = await db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return organization


@router.put("/me", response_model=OrganizationRead)
async def update_my_organization(
    payload: OrganizationUpdate,
    org_user: User = Depends(require_role("organization")),
    db: AsyncSession = Depends(get_db),
) -> Organization:
    result = await db.execute(select(Organization).where(Organization.user_id == org_user.id))
    organization = result.scalar_one_or_none()

    if organization is None:
        organization = Organization(user_id=org_user.id, name=payload.name)

    organization.name = payload.name
    organization.description = payload.description
    organization.website = payload.website

    db.add(organization)
    await db.commit()
    await db.refresh(organization)
    return organization


@router.get("/me/opportunities", response_model=list[OpportunityRead])
async def my_posted_opportunities(
    org_user: User = Depends(require_role("organization")),
    db: AsyncSession = Depends(get_db),
) -> list[Opportunity]:
    result = await db.execute(select(Organization).where(Organization.user_id == org_user.id))
    organization = result.scalar_one_or_none()
    if organization is None:
        return []

    opps = await db.execute(select(Opportunity).where(Opportunity.organization_id == organization.id))
    return list(opps.scalars().all())
