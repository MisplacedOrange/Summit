import asyncio
import ctypes
import csv
import json
import os
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse, urldefrag
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright

SEEDS = [
    "https://www.redcross.ca/volunteer",
    "https://www.foodbankscanada.ca/get-involved/volunteer/",
    "https://www.volunteertoronto.ca/networking/opening_search.asp",
]

KEYWORDS = {
    "volunteer",
    "opportunity",
    "apply",
    "role",
    "position",
    "join",
    "get involved",
    "help",
}

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

MAX_LINKS_PER_SEED = 40
WAIT_MS = 1800
GEMINI_MODEL = "gemini-2.0-flash"
MAX_AI_ENRICH_RECORDS = 30
ENCRYPTED_KEY_PATH = Path(__file__).resolve().parents[1] / ".secrets" / "gemini_api_key.dpapi"
INVALID_PAGE_MARKERS = {
    "404",
    "page not found",
    "access denied",
    "verify you are not a bot",
    "security service",
    "cloudflare",
    "captcha",
}


if os.name == "nt":
    CRYPTPROTECT_UI_FORBIDDEN = 0x1

    class DATA_BLOB(ctypes.Structure):
        _fields_ = [("cbData", ctypes.c_uint32), ("pbData", ctypes.POINTER(ctypes.c_ubyte))]

    crypt32 = ctypes.windll.crypt32
    kernel32 = ctypes.windll.kernel32


def _dpapi_protect(plain_text: str) -> bytes:
    if os.name != "nt":
        raise RuntimeError("DPAPI encryption is only available on Windows.")

    raw = plain_text.encode("utf-8")
    in_buffer = (ctypes.c_ubyte * len(raw))(*raw)
    in_blob = DATA_BLOB(len(raw), in_buffer)
    out_blob = DATA_BLOB()

    ok = crypt32.CryptProtectData(
        ctypes.byref(in_blob),
        "ImpactConnect GEMINI_API_KEY",
        None,
        None,
        None,
        CRYPTPROTECT_UI_FORBIDDEN,
        ctypes.byref(out_blob),
    )
    if not ok:
        raise RuntimeError("Windows DPAPI encryption failed.")

    try:
        return ctypes.string_at(out_blob.pbData, out_blob.cbData)
    finally:
        if out_blob.pbData:
            kernel32.LocalFree(out_blob.pbData)


def _dpapi_unprotect(cipher_bytes: bytes) -> str:
    if os.name != "nt":
        raise RuntimeError("DPAPI decryption is only available on Windows.")

    in_buffer = (ctypes.c_ubyte * len(cipher_bytes))(*cipher_bytes)
    in_blob = DATA_BLOB(len(cipher_bytes), in_buffer)
    out_blob = DATA_BLOB()

    ok = crypt32.CryptUnprotectData(
        ctypes.byref(in_blob),
        None,
        None,
        None,
        None,
        CRYPTPROTECT_UI_FORBIDDEN,
        ctypes.byref(out_blob),
    )
    if not ok:
        raise RuntimeError("Windows DPAPI decryption failed.")

    try:
        decrypted = ctypes.string_at(out_blob.pbData, out_blob.cbData)
        return decrypted.decode("utf-8")
    finally:
        if out_blob.pbData:
            kernel32.LocalFree(out_blob.pbData)


def save_encrypted_gemini_key(api_key: str) -> None:
    encrypted = _dpapi_protect(api_key)
    ENCRYPTED_KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
    ENCRYPTED_KEY_PATH.write_bytes(encrypted)


def load_encrypted_gemini_key() -> str:
    if not ENCRYPTED_KEY_PATH.exists():
        return ""
    try:
        return _dpapi_unprotect(ENCRYPTED_KEY_PATH.read_bytes()).strip()
    except Exception as exc:
        print(f"Could not decrypt {ENCRYPTED_KEY_PATH.name}: {exc}")
        return ""


def read_env_value(key: str) -> str:
    direct = os.getenv(key, "").strip()
    if direct:
        return direct

    repo_root = Path(__file__).resolve().parents[1]
    env_candidates = [repo_root / ".env", Path(__file__).resolve().parent / ".env"]

    for env_file in env_candidates:
        if not env_file.exists():
            continue
        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            env_key, env_value = line.split("=", 1)
            if env_key.strip() != key:
                continue
            return env_value.strip().strip('"').strip("'")

    return ""


def read_secret_file(path_value: str) -> str:
    path_value = (path_value or "").strip()
    if not path_value:
        return ""

    secret_path = Path(path_value)
    if not secret_path.is_absolute():
        secret_path = (Path(__file__).resolve().parents[1] / secret_path).resolve()

    if not secret_path.exists() or not secret_path.is_file():
        return ""

    try:
        return secret_path.read_text(encoding="utf-8").strip()
    except Exception as exc:
        print(f"Could not read secret file {secret_path}: {exc}")
        return ""


def resolve_gemini_api_key() -> str:
    env_key = read_env_value("GEMINI_API_KEY")
    if env_key:
        return env_key

    key_file = read_env_value("GEMINI_API_KEY_FILE")
    key_from_file = read_secret_file(key_file)
    if key_from_file:
        return key_from_file

    encrypted_key = load_encrypted_gemini_key()
    if encrypted_key:
        return encrypted_key

    return ""


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def normalize_url(base_url: str, href: str) -> str:
    full = urljoin(base_url, href)
    full, _ = urldefrag(full)
    return full.strip()


def domain_key(url: str) -> str:
    host = urlparse(url).netloc.lower().split(":")[0]
    parts = [part for part in host.split(".") if part]
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return host


def same_domain(url_a: str, url_b: str) -> bool:
    return domain_key(url_a) == domain_key(url_b)


def looks_like_relevant_link(text: str, href: str) -> bool:
    token_source = f"{text} {href}".lower()
    return any(keyword in token_source for keyword in KEYWORDS)


def infer_category(blob: str) -> str:
    text = blob.lower()
    for keyword, category in CATEGORY_KEYWORDS.items():
        if keyword in text:
            return category
    return "community services"


def infer_skills(blob: str) -> list[str]:
    text = blob.lower()
    hits = []
    for skill in SKILL_KEYWORDS:
        if skill in text:
            hits.append(skill)
    return sorted(hits) if hits else ["teamwork", "communication"]


def extract_time_commitment(blob: str) -> str:
    match = re.search(
        r"(\d+\s*(?:-|to)?\s*\d*\s*(?:hour|hours|hr|hrs)\s*(?:per\s*(?:week|month)|weekly|monthly)?)",
        blob,
        flags=re.IGNORECASE,
    )
    if match:
        return clean_text(match.group(1))
    return "Flexible"


def extract_location(blob: str) -> str:
    match = re.search(
        r"(?:location|city|where)\s*[:\-]\s*([A-Za-z\s,]{2,60})",
        blob,
        flags=re.IGNORECASE,
    )
    if match:
        return clean_text(match.group(1))
    remote_match = re.search(r"\b(remote|virtual|online)\b", blob, flags=re.IGNORECASE)
    if remote_match:
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


def is_invalid_page(page_soup: BeautifulSoup) -> bool:
    title = clean_text(page_soup.title.get_text()) if page_soup.title else ""
    sample = clean_text(page_soup.get_text(" ", strip=True)[:2000])
    probe = f"{title} {sample}".lower()
    return any(marker in probe for marker in INVALID_PAGE_MARKERS)


def get_candidate_links(seed_url: str, soup: BeautifulSoup) -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    seen: set[str] = set()

    for a in soup.find_all("a", href=True):
        anchor_text = clean_text(a.get_text(" ", strip=True))
        normalized = normalize_url(seed_url, a["href"])
        if not normalized.startswith(("http://", "https://")):
            continue
        if not same_domain(seed_url, normalized):
            continue
        if normalized.startswith(("mailto:", "tel:", "javascript:")):
            continue
        if normalized in seen:
            continue
        if not looks_like_relevant_link(anchor_text, normalized):
            continue

        seen.add(normalized)
        candidates.append((anchor_text, normalized))

        if len(candidates) >= MAX_LINKS_PER_SEED:
            break

    return candidates


async def fetch_soup(page, url: str) -> BeautifulSoup | None:
    try:
        await page.goto(url, timeout=60000, wait_until="domcontentloaded")
        await page.wait_for_timeout(WAIT_MS)
        html = await page.content()
        return BeautifulSoup(html, "html.parser")
    except PlaywrightTimeoutError:
        print(f"  - Timeout: {url}")
        return None
    except Exception as exc:
        print(f"  - Failed: {url} ({exc})")
        return None


def extract_record(
    source_seed: str,
    page_url: str,
    page_soup: BeautifulSoup,
    fallback_title: str,
) -> dict[str, str | int | list[str]]:
    title_tag = page_soup.find("h1")
    meta_description = page_soup.find("meta", attrs={"name": "description"})

    title = clean_text(title_tag.get_text()) if title_tag else fallback_title or "Volunteer Opportunity"
    description = ""
    if meta_description and meta_description.get("content"):
        description = clean_text(str(meta_description["content"]))

    if not description:
        paragraphs = page_soup.find_all("p")
        description = clean_text(" ".join(p.get_text(" ", strip=True) for p in paragraphs[:4]))

    text_blob = clean_text(f"{title} {description} {page_soup.get_text(' ', strip=True)[:3000]}")
    category = infer_category(text_blob)
    skills = infer_skills(text_blob)
    location = extract_location(text_blob)
    time_commitment = extract_time_commitment(text_blob)
    impact_level = estimate_impact(text_blob)

    return {
        "organization": urlparse(source_seed).netloc.replace("www.", ""),
        "title": title,
        "category": category,
        "skills": skills,
        "location": location,
        "time_commitment": time_commitment,
        "description": description[:500],
        "impact_level": impact_level,
        "link": page_url,
        "source": source_seed,
    }


def is_record_usable(record: dict[str, str | int | list[str]]) -> bool:
    title = str(record.get("title", "")).strip().lower()
    description = str(record.get("description", "")).strip().lower()
    if not title and not description:
        return False

    if title in {"404", "404 error", "page not found"}:
        return False
    if "verify you are not a bot" in description or "security service" in description:
        return False
    return True


def fallback_records_from_seeds() -> list[dict[str, str | int | list[str]]]:
    records: list[dict[str, str | int | list[str]]] = []
    for seed in SEEDS:
        domain = urlparse(seed).netloc.replace("www.", "")
        records.append(
            {
                "organization": domain,
                "title": f"Volunteer Opportunities - {domain}",
                "category": "community services",
                "skills": ["teamwork", "communication"],
                "location": "Toronto",
                "time_commitment": "Flexible",
                "description": "Explore current volunteer opportunities from this organization.",
                "impact_level": 6,
                "link": seed,
                "source": seed,
            }
        )
    return records


def normalize_ai_record(
    original: dict[str, str | int | list[str]],
    ai_record: dict[str, object],
) -> dict[str, str | int | list[str]]:
    normalized = dict(original)

    str_fields = [
        "organization",
        "title",
        "category",
        "location",
        "time_commitment",
        "description",
        "link",
        "source",
    ]
    for field in str_fields:
        if field in ai_record and isinstance(ai_record[field], str):
            normalized[field] = clean_text(str(ai_record[field]))

    if "skills" in ai_record:
        skills_raw = ai_record["skills"]
        if isinstance(skills_raw, list):
            skills = [clean_text(str(item)).lower() for item in skills_raw if clean_text(str(item))]
            normalized["skills"] = sorted(set(skills)) if skills else infer_skills(str(normalized.get("description", "")))

    if "impact_level" in ai_record:
        try:
            value = int(ai_record["impact_level"])
            normalized["impact_level"] = max(1, min(value, 10))
        except (TypeError, ValueError):
            pass

    if not normalized.get("description"):
        normalized["description"] = str(original.get("description", ""))

    return normalized


def enrich_record_with_gemini(
    record: dict[str, str | int | list[str]],
    api_key: str,
    model: str,
) -> dict[str, str | int | list[str]]:
    prompt = (
        "You are cleaning volunteer opportunity data. "
        "Return only one JSON object with these keys: "
        "organization, title, category, skills, location, time_commitment, description, impact_level, link, source. "
        "Rules: keep meaning faithful to input, make text concise, category must be one of "
        "[environment, healthcare, education, food security, community services], "
        "skills must be an array of short lowercase skills, impact_level must be integer 1-10.\n\n"
        f"Input record:\n{json.dumps(record, ensure_ascii=False)}"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    request = Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=35) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"  - Gemini enrich failed for {record.get('link', '')}: {exc}")
        return record

    try:
        text = body["candidates"][0]["content"]["parts"][0]["text"]
        ai_record = json.loads(text)
        if isinstance(ai_record, dict):
            return normalize_ai_record(record, ai_record)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        print(f"  - Gemini parse failed for {record.get('link', '')}: {exc}")

    return record


def second_pass_enrich(records: list[dict[str, str | int | list[str]]]) -> list[dict[str, str | int | list[str]]]:
    api_key = resolve_gemini_api_key()
    if not api_key:
        print(
            "\nSkipping AI second pass (set GEMINI_API_KEY, GEMINI_API_KEY_FILE, "
            "or local encrypted key file to enable)."
        )
        return records

    model = read_env_value("GEMINI_MODEL") or GEMINI_MODEL
    cap_raw = read_env_value("MAX_AI_ENRICH_RECORDS") or str(MAX_AI_ENRICH_RECORDS)
    try:
        cap = max(1, int(cap_raw))
    except ValueError:
        cap = MAX_AI_ENRICH_RECORDS

    print(f"\nRunning AI second pass with {model} (up to {min(cap, len(records))} records)...")

    enriched: list[dict[str, str | int | list[str]]] = []
    for index, record in enumerate(records):
        if index >= cap:
            enriched.append(record)
            continue
        enriched_record = enrich_record_with_gemini(record, api_key=api_key, model=model)
        if is_record_usable(enriched_record):
            enriched.append(enriched_record)

    return enriched if enriched else records


def write_outputs(opportunities: list[dict[str, str | int | list[str]]]) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    csv_path = repo_root / "volunteer_opportunities.csv"
    json_path = repo_root / "opportunities.json"

    json_path.write_text(json.dumps(opportunities, indent=2), encoding="utf-8")

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
        for record in opportunities:
            row = dict(record)
            row["skills"] = ", ".join(record["skills"])  # type: ignore[index]
            writer.writerow(row)

    print(f"\nSaved {len(opportunities)} opportunities")
    print(f"- CSV: {csv_path}")
    print(f"- JSON: {json_path}")


async def main() -> None:
    print("Starting ImpactConnect scraper...\n")
    opportunities: list[dict[str, str | int | list[str]]] = []
    seen_links: set[str] = set()

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(ignore_https_errors=True)
        page = await context.new_page()

        for seed in SEEDS:
            print(f"Scraping seed: {seed}")
            seed_soup = await fetch_soup(page, seed)
            if not seed_soup:
                continue

            candidates = get_candidate_links(seed, seed_soup)
            print(f"  - Found {len(candidates)} candidate links")

            if not candidates:
                seed_record = extract_record(
                    source_seed=seed,
                    page_url=seed,
                    page_soup=seed_soup,
                    fallback_title="Volunteer Opportunity",
                )
                if is_record_usable(seed_record):
                    opportunities.append(seed_record)
                continue

            for fallback_title, candidate_url in candidates:
                if candidate_url in seen_links:
                    continue

                seen_links.add(candidate_url)
                candidate_soup = await fetch_soup(page, candidate_url)
                if not candidate_soup:
                    continue

                record = extract_record(
                    source_seed=seed,
                    page_url=candidate_url,
                    page_soup=candidate_soup,
                    fallback_title=fallback_title,
                )
                if is_record_usable(record):
                    opportunities.append(record)

        await context.close()
        await browser.close()

    deduped: dict[str, dict[str, str | int | list[str]]] = {}
    for opportunity in opportunities:
        deduped[opportunity["link"]] = opportunity  # type: ignore[index]

    final_records = list(deduped.values())
    if not final_records:
        print("\nNo scrapeable opportunity pages found; writing fallback seed records.")
        final_records = fallback_records_from_seeds()

    final_records = second_pass_enrich(final_records)

    write_outputs(final_records)


if __name__ == "__main__":
    if "--set-gemini-key" in sys.argv:
        if os.name != "nt":
            raise SystemExit("--set-gemini-key currently supports Windows only.")
        key = input("Paste GEMINI_API_KEY: ").strip()
        if not key:
            raise SystemExit("No key entered.")
        save_encrypted_gemini_key(key)
        print(f"Encrypted key saved to {ENCRYPTED_KEY_PATH}")
        raise SystemExit(0)

    asyncio.run(main())