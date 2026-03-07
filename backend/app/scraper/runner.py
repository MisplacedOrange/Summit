from __future__ import annotations

import csv
import json
from dataclasses import asdict
from pathlib import Path
from urllib.parse import urlparse

from app.scraper.deduplicator import deduplicate_records
from app.scraper.extractor import ExtractedOpportunity, heuristic_extract, merge_ai_result
from app.scraper.playwright_scraper import try_scrape_page
from app.scraper.static_scraper import fetch_html, get_candidate_links
from app.services.gemini import gemini_service

SEEDS = [
    "https://www.redcross.ca/volunteer",
    "https://www.foodbankscanada.ca/get-involved/volunteer/",
    "https://www.volunteertoronto.ca/networking/opening_search.asp",
]

INVALID_PAGE_MARKERS = {
    "404",
    "page not found",
    "access denied",
    "verify you are not a bot",
    "security service",
    "cloudflare",
    "captcha",
}


def _is_invalid_page(html: str) -> bool:
    probe = " ".join(html.lower().split())[:2500]
    return any(marker in probe for marker in INVALID_PAGE_MARKERS)


def _fallback_records() -> list[ExtractedOpportunity]:
    records: list[ExtractedOpportunity] = []
    for seed in SEEDS:
        domain = urlparse(seed).netloc.replace("www.", "")
        records.append(
            ExtractedOpportunity(
                organization=domain,
                title=f"Volunteer Opportunities - {domain}",
                category="community services",
                skills=["teamwork", "communication"],
                location="Toronto",
                time_commitment="Flexible",
                description="Explore current volunteer opportunities from this organization.",
                impact_level=6,
                link=seed,
                source=seed,
            )
        )
    return records


async def _extract_record(source_seed: str, candidate_url: str, fallback_title: str) -> ExtractedOpportunity | None:
    html = await fetch_html(candidate_url)
    if html is None:
        html = await try_scrape_page(candidate_url)
    if not html or _is_invalid_page(html):
        return None

    base = heuristic_extract(source_seed=source_seed, page_url=candidate_url, html=html, fallback_title=fallback_title)

    ai_data = None
    try:
        # Reuse service with strict JSON intent; empty response falls back to heuristic record.
        ai_raw = await gemini_service.generate(
            "Return only JSON with keys organization,title,category,skills,location,time_commitment,description,impact_level\n\n"
            + html[:10000]
        )
        if ai_raw:
            ai_data = json.loads(ai_raw)
    except Exception:
        ai_data = None

    return merge_ai_result(base, ai_data if isinstance(ai_data, dict) else None)


async def run_pipeline() -> list[dict[str, object]]:
    opportunities: list[dict[str, object]] = []
    seen_links: set[str] = set()

    for seed in SEEDS:
        seed_html = await fetch_html(seed)
        if seed_html is None:
            seed_html = await try_scrape_page(seed)
        if not seed_html:
            continue

        candidates = get_candidate_links(seed, seed_html)
        if not candidates:
            record = await _extract_record(seed, seed, "Volunteer Opportunity")
            if record:
                opportunities.append(asdict(record))
            continue

        for fallback_title, candidate_url in candidates:
            if candidate_url in seen_links:
                continue
            seen_links.add(candidate_url)

            record = await _extract_record(seed, candidate_url, fallback_title)
            if record is not None:
                opportunities.append(asdict(record))

    deduped = deduplicate_records(opportunities)
    if not deduped:
        return [asdict(item) for item in _fallback_records()]
    return deduped


async def run_pipeline_and_save(repo_root: Path | None = None) -> list[dict[str, object]]:
    records = await run_pipeline()

    if repo_root is None:
        repo_root = Path(__file__).resolve().parents[3]

    csv_path = repo_root / "volunteer_opportunities.csv"
    json_path = repo_root / "opportunities.json"

    json_path.write_text(json.dumps(records, indent=2), encoding="utf-8")

    fieldnames = [
        "organization",
        "title",
        "category",
        "skills",
        "location",
        "time_commitment",
        "description",
        "impact_level",
        "link",
        "source",
    ]

    with csv_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            row = dict(record)
            skills = row.get("skills", [])
            row["skills"] = ", ".join(str(item) for item in skills) if isinstance(skills, list) else ""
            writer.writerow(row)

    return records
