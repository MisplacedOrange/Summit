from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserPreferencesUpdate(BaseModel):
    interests: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    location_lat: float | None = None
    location_lng: float | None = None
    radius_km: int = Field(default=25, ge=1, le=250)


class UserCreateUpdate(BaseModel):
    email: str
    full_name: str | None = None
    role: str = "student"


class UserPreferencesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    interests: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    location_lat: float | None = None
    location_lng: float | None = None
    radius_km: int = 25
    updated_at: datetime | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    auth0_id: str
    email: str
    full_name: str | None
    role: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    preferences: UserPreferencesRead | None = None
