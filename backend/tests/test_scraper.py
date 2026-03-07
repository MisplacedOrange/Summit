from app.scraper.deduplicator import deduplicate_records, is_duplicate_in_memory


def test_deduplicate_records_by_link():
    rows = [
        {"link": "https://example.com/a", "title": "A"},
        {"link": "https://example.com/a", "title": "A copy"},
        {"link": "https://example.com/b", "title": "B"},
    ]
    deduped = deduplicate_records(rows)
    assert len(deduped) == 2


def test_in_memory_duplicate_title_or_url():
    rows = [{"link": "https://example.com/a", "title": "Park Cleanup"}]
    assert is_duplicate_in_memory(rows, "https://example.com/a", "Something") is True
    assert is_duplicate_in_memory(rows, None, "Park Cleanup") is True
    assert is_duplicate_in_memory(rows, None, "Other") is False
