from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.opportunity import Opportunity
from app.models.user import UserPreference
from app.scraper.runner import run_pipeline
from app.services.gemini import gemini_service
from app.services.geocoding import geocode_address
from app.services.recommendation import update_user_embedding
from app.workers.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def run_scraping_pipeline(self) -> int:
    async def _run_and_store() -> int:
        records = await run_pipeline()
        inserted = 0
        async with SessionLocal() as db:
            for row in records:
                source_url = str(row.get("link", "")).strip() or None
                title = str(row.get("title", "")).strip()
                if not title:
                    continue

                if source_url:
                    existing = await db.execute(select(Opportunity.id).where(Opportunity.source_url == source_url).limit(1))
                    if existing.first() is not None:
                        continue

                skills_raw = row.get("skills", [])
                skills = [str(item).strip().lower() for item in skills_raw if str(item).strip()] if isinstance(skills_raw, list) else []

                opp = Opportunity(
                    title=title,
                    description=str(row.get("description", "")).strip() or "Volunteer opportunity",
                    cause_category=str(row.get("category", "")).strip() or None,
                    location_text=str(row.get("location", "")).strip() or None,
                    skills_required=skills,
                    source_url=source_url,
                    is_scraped=True,
                )

                # Geocode from location_text
                loc_text = opp.location_text
                if loc_text:
                    geo = await geocode_address(loc_text)
                    if geo.lat is not None and geo.lng is not None:
                        opp.location_lat = geo.lat
                        opp.location_lng = geo.lng
                        opp.geocode_source = geo.source
                        opp.geocode_confidence = geo.confidence
                        opp.geocoded_at = datetime.now(timezone.utc)

                db.add(opp)
                inserted += 1

            await db.commit()

        return inserted

    try:
        return asyncio.run(_run_and_store())
    except Exception as exc:  # pragma: no cover
        raise self.retry(exc=exc)


@celery_app.task
def generate_opportunity_embedding(opportunity_id: str) -> bool:
    async def _inner() -> bool:
        async with SessionLocal() as db:
            opp = await db.get(Opportunity, opportunity_id)
            if opp is None:
                return False
            opp.embedding = await gemini_service.embed(f"{opp.title}\n{opp.description}")
            db.add(opp)
            await db.commit()
            return True

    return asyncio.run(_inner())


@celery_app.task
def update_user_recommendations(user_id: str) -> bool:
    async def _inner() -> bool:
        async with SessionLocal() as db:
            result = await db.execute(select(UserPreference).where(UserPreference.user_id == user_id))
            preference = result.scalar_one_or_none()
            if preference is None:
                return False
            await update_user_embedding(db, preference)
            return True

    return asyncio.run(_inner())
