from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from app.scraper.runner import run_pipeline_and_save


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Summit scraping pipeline")
    parser.add_argument(
        "--output-root",
        type=str,
        default="",
        help="Optional path where opportunities.json and volunteer_opportunities.csv are written",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    output_root = Path(args.output_root).resolve() if args.output_root else None
    records = await run_pipeline_and_save(repo_root=output_root)
    print(f"Saved {len(records)} opportunities")


if __name__ == "__main__":
    asyncio.run(main())
