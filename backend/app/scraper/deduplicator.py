from __future__ import annotations

def deduplicate_records(records: list[dict[str, object]]) -> list[dict[str, object]]:
    seen_links: set[str] = set()
    deduped: list[dict[str, object]] = []
    for record in records:
        link = str(record.get("link", "")).strip()
        if not link or link in seen_links:
            continue
        seen_links.add(link)
        deduped.append(record)
    return deduped


def is_duplicate_in_memory(existing: list[dict[str, object]], source_url: str | None, title: str) -> bool:
    normalized_title = title.strip().lower()
    for row in existing:
        row_url = str(row.get("link", "")).strip()
        row_title = str(row.get("title", "")).strip().lower()
        if source_url and row_url and row_url == source_url:
            return True
        if normalized_title and row_title and normalized_title == row_title:
            return True
    return False


async def is_duplicate(source_url: str | None, title: str, db: object | None = None) -> bool:
    """Adapter hook for framework-level DB dedupe checks.

    If the provided db object exposes an async `is_duplicate_opportunity` method,
    this function delegates to it; otherwise it returns False.
    """
    if db is None:
        return False
    checker = getattr(db, "is_duplicate_opportunity", None)
    if checker is None:
        return False
    result = checker(source_url=source_url, title=title)
    if hasattr(result, "__await__"):
        return bool(await result)
    return bool(result)
