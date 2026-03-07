from __future__ import annotations

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright


async def scrape_page(url: str, timeout_ms: int = 60000) -> str:
    """Fetch HTML from a JS-rendered page using Playwright."""
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(url, timeout=timeout_ms, wait_until="domcontentloaded")
            await page.wait_for_timeout(1500)
            return await page.content()
        finally:
            await browser.close()


async def try_scrape_page(url: str, timeout_ms: int = 60000) -> str | None:
    try:
        return await scrape_page(url, timeout_ms=timeout_ms)
    except PlaywrightTimeoutError:
        return None
    except Exception:
        return None
