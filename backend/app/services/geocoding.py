from __future__ import annotations

import httpx

from app.config import settings


async def geocode_address(address: str) -> tuple[float | None, float | None]:
    if not address or not settings.MAPBOX_SECRET_TOKEN:
        return (None, None)

    endpoint = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{address}.json"
    params = {"access_token": settings.MAPBOX_SECRET_TOKEN, "limit": 1}

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(endpoint, params=params)
        response.raise_for_status()
        data = response.json()

    features = data.get("features", [])
    if not features:
        return (None, None)

    center = features[0].get("center", [])
    if len(center) != 2:
        return (None, None)

    lng, lat = center
    return float(lat), float(lng)
