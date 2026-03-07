from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.opportunity import Opportunity
from app.models.user import UserPreference
from app.scraper.runner import run_pipeline
from app.services.gemini import gemini_service
from app.services.recommendation import update_user_embedding
from app.workers.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def run_scraping_pipeline(self) -> int:
    try:
        records = asyncio.run(run_pipeline())
        return len(records)
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
