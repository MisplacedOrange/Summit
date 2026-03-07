from urllib.parse import parse_qs, unquote, urlparse

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Hack Canada 2026 API")

# Allow local frontend dev servers to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "FastAPI backend is running"}


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


def _extract_result_url(raw_href: str) -> str:
    """Convert DuckDuckGo redirect links into direct target URLs."""
    if raw_href.startswith("http"):
        return raw_href

    if raw_href.startswith("/"):
        parsed = urlparse(raw_href)
        query = parse_qs(parsed.query)
        redirect = query.get("uddg", [""])[0]
        if redirect:
            return unquote(redirect)

    return raw_href


@app.get("/api/volunteer-organizations")
async def volunteer_organizations(
    q: str = Query(
        default="volunteer opportunities nonprofits community organizations",
        min_length=3,
    ),
    limit: int = Query(default=12, ge=1, le=25),
) -> dict[str, object]:
    """Scrape public search result pages for volunteer-friendly organizations."""
    search_url = "https://duckduckgo.com/html/"
    headers = {"User-Agent": "Mozilla/5.0 (HackCanadaVolunteerFinder/1.0)"}

    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
        response = await client.get(search_url, params={"q": q}, headers=headers)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    results: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    for row in soup.select(".result"):
        title_link = row.select_one("a.result__a")
        snippet_el = row.select_one(".result__snippet")

        if title_link is None:
            continue

        title = title_link.get_text(strip=True)
        href = title_link.get("href", "").strip()
        snippet = snippet_el.get_text(strip=True) if snippet_el else ""

        if not title or not href:
            continue

        url = _extract_result_url(href)
        if not url or url in seen_urls:
            continue

        # Keep results oriented around volunteering and nonprofit work.
        relevance_text = f"{title} {snippet}".lower()
        if not any(
            token in relevance_text
            for token in ["volunteer", "nonprofit", "charity", "community", "foundation"]
        ):
            continue

        results.append(
            {
                "name": title,
                "url": url,
                "description": snippet or "No description provided.",
            }
        )
        seen_urls.add(url)

        if len(results) >= limit:
            break

    return {
        "query": q,
        "count": len(results),
        "source": "DuckDuckGo public HTML results",
        "items": results,
    }
