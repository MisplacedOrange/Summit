"""Tests for location utility functions and geocoding integration."""

import pytest

from app.services.location import haversine_km, validate_coordinates, coordinates_present


class TestHaversineKm:
    def test_same_point_returns_zero(self):
        assert haversine_km(43.6532, -79.3832, 43.6532, -79.3832) == 0.0

    def test_toronto_to_mississauga(self):
        # ~24 km between downtown Toronto and Mississauga city center
        distance = haversine_km(43.6532, -79.3832, 43.5890, -79.6441)
        assert 20 < distance < 30

    def test_toronto_to_vancouver(self):
        # ~3360 km across Canada
        distance = haversine_km(43.6532, -79.3832, 49.2827, -123.1207)
        assert 3300 < distance < 3400

    def test_symmetric(self):
        d1 = haversine_km(43.6532, -79.3832, 45.5017, -73.5673)
        d2 = haversine_km(45.5017, -73.5673, 43.6532, -79.3832)
        assert abs(d1 - d2) < 0.001


class TestValidateCoordinates:
    def test_valid_toronto(self):
        assert validate_coordinates(43.6532, -79.3832) is True

    def test_none_lat(self):
        assert validate_coordinates(None, -79.3832) is False

    def test_none_lng(self):
        assert validate_coordinates(43.6532, None) is False

    def test_both_none(self):
        assert validate_coordinates(None, None) is False

    def test_lat_out_of_range(self):
        assert validate_coordinates(91.0, -79.3832) is False
        assert validate_coordinates(-91.0, -79.3832) is False

    def test_lng_out_of_range(self):
        assert validate_coordinates(43.6532, 181.0) is False
        assert validate_coordinates(43.6532, -181.0) is False

    def test_edge_values(self):
        assert validate_coordinates(90.0, 180.0) is True
        assert validate_coordinates(-90.0, -180.0) is True
        assert validate_coordinates(0.0, 0.0) is True


class TestCoordinatesPresent:
    def test_present(self):
        assert coordinates_present(43.6532, -79.3832) is True

    def test_not_present(self):
        assert coordinates_present(None, None) is False


@pytest.mark.anyio
async def test_map_pins_only_real_coords(client):
    """The /map endpoint should only return opportunities with real geocoded coords."""
    response = await client.get("/v1/opportunities/map")
    assert response.status_code == 200
    pins = response.json()
    # All returned pins should have non-null coords
    for pin in pins:
        assert pin["location_lat"] is not None
        assert pin["location_lng"] is not None


@pytest.mark.anyio
async def test_heat_points_endpoint(client):
    """The /map/heat endpoint should return a list of weighted points."""
    response = await client.get("/v1/opportunities/map/heat")
    assert response.status_code == 200
    points = response.json()
    assert isinstance(points, list)
    for point in points:
        assert "lat" in point
        assert "lng" in point
        assert "weight" in point
        assert 0 <= point["weight"] <= 1.0
