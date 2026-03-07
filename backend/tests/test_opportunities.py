import pytest


@pytest.mark.anyio
async def test_create_and_get_opportunity(client, mock_auth_headers):
    await client.post(
        "/v1/users/me",
        json={"email": "org@example.com", "full_name": "Org User", "role": "organization"},
        headers=mock_auth_headers,
    )

    create_response = await client.post(
        "/v1/opportunities",
        json={
            "title": "Food Drive Volunteer",
            "description": "Help package and distribute food.",
            "cause_category": "food security",
            "volunteers_needed": 10,
        },
        headers=mock_auth_headers,
    )
    assert create_response.status_code == 200
    opp = create_response.json()

    get_response = await client.get(f"/v1/opportunities/{opp['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["title"] == "Food Drive Volunteer"


@pytest.mark.anyio
async def test_join_and_save_opportunity(client, mock_auth_headers):
    await client.post(
        "/v1/users/me",
        json={"email": "org2@example.com", "full_name": "Org User", "role": "organization"},
        headers=mock_auth_headers,
    )
    created = await client.post(
        "/v1/opportunities",
        json={"title": "Tree Planting", "description": "Help plant trees", "volunteers_needed": 5},
        headers=mock_auth_headers,
    )
    opp_id = created.json()["id"]

    await client.post(
        "/v1/users/me",
        json={"email": "student@example.com", "full_name": "Student", "role": "student"},
        headers=mock_auth_headers,
    )

    join_response = await client.post(f"/v1/opportunities/{opp_id}/join", headers=mock_auth_headers)
    assert join_response.status_code == 200

    save_response = await client.post(f"/v1/opportunities/{opp_id}/save", headers=mock_auth_headers)
    assert save_response.status_code == 200
