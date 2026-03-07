from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass

from bs4 import BeautifulSoup

from app.services.gemini import gemini_service

CATEGORY_KEYWORDS = {
    "food": "food security",
    "bank": "food security",
    "hunger": "food security",
    "youth": "education",
    "school": "education",
    "teach": "education",
    "health": "healthcare",
    "hospital": "healthcare",
    "clinic": "healthcare",
    "climate": "environment",
    "environment": "environment",
    "community": "community services",
    "shelter": "community services",
}

SKILL_KEYWORDS = {
    "communication",
    "leadership",
    "organization",
    "teamwork",
    "teaching",
    "mentoring",
    "driving",
    "fundraising",
    "cooking",
    "event",
}

EXTRACTION_PROMPT = """
Extract volunteer opportunity details from the following HTML text.
Return only valid JSON with keys:
organization, title, category, skills, location, time_commitment, description, impact_level.
If a field is unavailable, use null (or [] for skills).

HTML:
{html}
"""


@dataclass
class ExtractedOpportunity:
    organization: str
    title: str
    category: str
    skills: list[str]
    location: str
    time_commitment: str
    description: str
    impact_level: int
    link: str
    source: str


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def infer_category(blob: str) -> str:
    text = blob.lower()
    for keyword, category in CATEGORY_KEYWORDS.items():
        if keyword in text:
            return category
    return "community services"


def infer_skills(blob: str) -> list[str]:
    text = blob.lower()
    found = sorted({skill for skill in SKILL_KEYWORDS if skill in text})
    return found if found else ["communication", "teamwork"]


def extract_time_commitment(blob: str) -> str:
    match = re.search(
        r"(\d+\s*(?:-|to)?\s*\d*\s*(?:hour|hours|hr|hrs)\s*(?:per\s*(?:week|month)|weekly|monthly)?)",
        blob,
        flags=re.IGNORECASE,
    )
    return clean_text(match.group(1)) if match else "Flexible"


def extract_location(blob: str) -> str:
    match = re.search(r"(?:location|city|where)\s*[:\-]\s*([A-Za-z\s,]{2,60})", blob, flags=re.IGNORECASE)
    if match:
        return clean_text(match.group(1))
    if re.search(r"\b(remote|virtual|online)\b", blob, flags=re.IGNORECASE):
        return "Remote"
    return "Toronto"


def estimate_impact(blob: str) -> int:
    text = blob.lower()
    score = 5
    if "urgent" in text or "immediate" in text:
        score += 2
    if "community" in text or "people" in text:
        score += 1
    if "food" in text or "health" in text or "shelter" in text:
        score += 1
    return max(1, min(score, 10))


def heuristic_extract(source_seed: str, page_url: str, html: str, fallback_title: str) -> ExtractedOpportunity:
    soup = BeautifulSoup(html, "html.parser")

    title_tag = soup.find("h1")
    meta_description = soup.find("meta", attrs={"name": "description"})

    title = clean_text(title_tag.get_text()) if title_tag else clean_text(fallback_title or "Volunteer Opportunity")

    description = ""
    if meta_description and meta_description.get("content"):
        description = clean_text(str(meta_description["content"]))

    if not description:
        paragraphs = soup.find_all("p")
        description = clean_text(" ".join(p.get_text(" ", strip=True) for p in paragraphs[:4]))

    text_blob = clean_text(f"{title} {description} {soup.get_text(' ', strip=True)[:3000]}")

    return ExtractedOpportunity(
        organization=source_seed,
        title=title,
        category=infer_category(text_blob),
        skills=infer_skills(text_blob),
        location=extract_location(text_blob),
        time_commitment=extract_time_commitment(text_blob),
        description=description[:500],
        impact_level=estimate_impact(text_blob),
        link=page_url,
        source=source_seed,
    )


async def ai_extract(raw_html: str) -> dict[str, object] | None:
    prompt = EXTRACTION_PROMPT.format(html=clean_text(raw_html)[:12000])
    response = await gemini_service.generate(prompt)
    if not response:
        return None
    try:
        data = json.loads(response)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        return None
    return None


def merge_ai_result(base: ExtractedOpportunity, ai: dict[str, object] | None) -> ExtractedOpportunity:
    if not ai:
        return base

    merged = asdict(base)
    for field in [
        "organization",
        "title",
        "category",
        "location",
        "time_commitment",
        "description",
    ]:
        value = ai.get(field)
        if isinstance(value, str) and value.strip():
            merged[field] = clean_text(value)

    skills = ai.get("skills")
    if isinstance(skills, list):
        merged["skills"] = [clean_text(str(item)).lower() for item in skills if clean_text(str(item))]

    impact = ai.get("impact_level")
    if isinstance(impact, (int, float, str)):
        try:
            merged["impact_level"] = max(1, min(int(impact), 10))
        except ValueError:
            pass

    return ExtractedOpportunity(**merged)
