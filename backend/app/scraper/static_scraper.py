from __future__ import annotations

from urllib.parse import urldefrag, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

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


async def fetch_html(url: str, timeout_s: float = 20.0) -> str | None:
    headers = {"User-Agent": "Mozilla/5.0 (ImpactMatchScraper/1.0)"}
    try:
        async with httpx.AsyncClient(timeout=timeout_s, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.text
    except Exception:
        return None


def parse_html(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "html.parser")


def _normalize_url(base_url: str, href: str) -> str:
    full = urljoin(base_url, href)
    normalized, _ = urldefrag(full)
    return normalized.strip()


def _domain_key(url: str) -> str:
    host = urlparse(url).netloc.lower().split(":")[0]
    parts = [part for part in host.split(".") if part]
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return host


def _same_domain(url_a: str, url_b: str) -> bool:
    return _domain_key(url_a) == _domain_key(url_b)


def get_candidate_links(seed_url: str, html: str, max_links: int = 40) -> list[tuple[str, str]]:
    soup = parse_html(html)
    candidates: list[tuple[str, str]] = []
    seen: set[str] = set()

    for anchor in soup.find_all("a", href=True):
        text = anchor.get_text(" ", strip=True)
        href = _normalize_url(seed_url, anchor["href"])
        token_source = f"{text} {href}".lower()

        if not href.startswith(("http://", "https://")):
            continue
        if href.startswith(("mailto:", "tel:", "javascript:")):
            continue
        if not _same_domain(seed_url, href):
            continue
        if href in seen:
            continue
        if not any(keyword in token_source for keyword in KEYWORDS):
            continue

        seen.add(href)
        candidates.append((text, href))
        if len(candidates) >= max_links:
            break

    return candidates
