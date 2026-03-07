"""Backfill script: geocode opportunities that have location_text but no coordinates.

Usage:
    python -m backend.app.scripts.backfill_geocode [--dry-run] [--batch-size 50]
"""
from __future__ import annotations

import argparse
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import and_, select

from app.db.session import SessionLocal
from app.models.opportunity import Opportunity
from app.services.geocoding import geocode_address

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def backfill(dry_run: bool = False, batch_size: int = 50) -> int:
    geocoded = 0
    async with SessionLocal() as db:
        stmt = (
            select(Opportunity)
            .where(
                and_(
                    Opportunity.location_text.is_not(None),
                    Opportunity.location_text != "",
                    Opportunity.location_lat.is_(None),
                )
            )
            .limit(batch_size)
        )
        result = await db.execute(stmt)
        rows = list(result.scalars().all())

        logger.info("Found %d opportunities to geocode (batch_size=%d)", len(rows), batch_size)

        for opp in rows:
            geo = await geocode_address(opp.location_text)
            if geo.lat is not None and geo.lng is not None:
                if dry_run:
                    logger.info("[DRY RUN] Would geocode '%s' -> (%.6f, %.6f) confidence=%.2f", opp.location_text, geo.lat, geo.lng, geo.confidence)
                else:
                    opp.location_lat = geo.lat
                    opp.location_lng = geo.lng
                    opp.geocode_source = geo.source
                    opp.geocode_confidence = geo.confidence
                    opp.geocoded_at = datetime.now(timezone.utc)
                    db.add(opp)
                geocoded += 1
            else:
                logger.warning("Could not geocode '%s' for opportunity %s", opp.location_text, opp.id)

        if not dry_run:
            await db.commit()

    logger.info("Geocoded %d / %d opportunities%s", geocoded, len(rows), " (dry run)" if dry_run else "")
    return geocoded


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill geocode coordinates for existing opportunities")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing to DB")
    parser.add_argument("--batch-size", type=int, default=50, help="Max rows to process per run")
    args = parser.parse_args()
    asyncio.run(backfill(dry_run=args.dry_run, batch_size=args.batch_size))


if __name__ == "__main__":
    main()
