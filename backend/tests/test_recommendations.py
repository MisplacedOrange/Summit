import pytest

from app.models.opportunity import Opportunity
from app.models.user import User, UserPreference
from app.services.recommendation import get_recommendations


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
    if body["items"]:
        assert "reason" in body["items"][0]


@pytest.mark.anyio
async def test_recommendations_rank_relevant_opportunity_first(db_session):
    user = User(auth0_id="auth0|rec-test", email="rec@example.com", full_name="Recommender", role="student")
    db_session.add(user)
    await db_session.flush()

    preferences = UserPreference(
        user_id=user.id,
        interests=["education", "mentorship"],
        skills=["teaching", "communication"],
        location_lat=43.6532,
        location_lng=-79.3832,
        radius_km=30,
    )
    db_session.add(preferences)

    good_match = Opportunity(
        title="Youth Homework Mentor",
        description="Support students after school with homework help and one-on-one mentorship.",
        cause_category="education",
        location_text="Toronto",
        location_lat=43.65,
        location_lng=-79.38,
        volunteers_needed=10,
        volunteers_signed=2,
        skills_required=["teaching", "communication"],
    )
    weak_match = Opportunity(
        title="Dog Shelter Cleanup",
        description="Help clean kennels and organize supplies at the animal shelter.",
        cause_category="animal-care",
        location_text="Hamilton",
        location_lat=43.2557,
        location_lng=-79.8711,
        volunteers_needed=3,
        volunteers_signed=2,
        skills_required=["cleaning"],
    )
    db_session.add_all([good_match, weak_match])
    await db_session.commit()

    recommendations = await get_recommendations(db_session, preferences, limit=5)

    assert recommendations
    top_opportunity, top_score, top_reason = recommendations[0]
    assert top_opportunity.title == "Youth Homework Mentor"
    assert 0 <= top_score <= 1
    assert "interest" in top_reason.lower() or "skill" in top_reason.lower()
