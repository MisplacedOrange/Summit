from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.config import settings


@dataclass
class GeocodingResult:
    lat: float | None
    lng: float | None
    confidence: float
    source: str  # "mapbox" | "manual" | "none"


async def geocode_address(address: str) -> GeocodingResult:
    """Geocode an address string via Mapbox, returning a structured result."""
    if not address or not settings.MAPBOX_SECRET_TOKEN:
        return GeocodingResult(lat=None, lng=None, confidence=0.0, source="none")

    endpoint = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{address}.json"
    params = {"access_token": settings.MAPBOX_SECRET_TOKEN, "limit": 1}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(endpoint, params=params)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, httpx.TimeoutException):
        return GeocodingResult(lat=None, lng=None, confidence=0.0, source="none")

    features = data.get("features", [])
    if not features:
        return GeocodingResult(lat=None, lng=None, confidence=0.0, source="mapbox")

    feature = features[0]
    center = feature.get("center", [])
    if len(center) != 2:
        return GeocodingResult(lat=None, lng=None, confidence=0.0, source="mapbox")

    lng, lat = center
    relevance = float(feature.get("relevance", 0.0))
    return GeocodingResult(lat=float(lat), lng=float(lng), confidence=relevance, source="mapbox")
