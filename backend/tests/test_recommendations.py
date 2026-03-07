import pytest


@pytest.mark.anyio
async def test_recommendations_returns_items(client, mock_auth_headers):
    await client.post(
        "/v1/users/me",
        json={"email": "org3@example.com", "full_name": "Org", "role": "organization"},
        headers=mock_auth_headers,
    )
    await client.post(
        "/v1/opportunities",
        json={
            "title": "Homework Tutor",
            "description": "Tutor high school students",
            "cause_category": "education",
            "volunteers_needed": 8,
        },
        headers=mock_auth_headers,
    )

    await client.post(
        "/v1/users/me",
        json={"email": "student2@example.com", "full_name": "Student", "role": "student"},
        headers=mock_auth_headers,
    )
    await client.put(
        "/v1/users/me/preferences",
        json={"interests": ["education"], "skills": ["teaching"], "radius_km": 25},
        headers=mock_auth_headers,
    )

    response = await client.get("/v1/recommendations", headers=mock_auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert isinstance(body["items"], list)
