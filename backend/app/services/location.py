"""Shared location utilities — single source of truth for coordinate helpers."""

from __future__ import annotations

import math


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in km between two (lat, lng) points."""
    earth_km = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return earth_km * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def validate_coordinates(lat: float | None, lng: float | None) -> bool:
    """Return True if lat/lng are valid WGS-84 coordinates."""
    if lat is None or lng is None:
        return False
    return -90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0


def coordinates_present(lat: float | None, lng: float | None) -> bool:
    """Return True if both lat and lng are non-None and valid."""
    return validate_coordinates(lat, lng)
