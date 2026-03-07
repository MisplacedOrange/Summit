from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OpportunityCreate(BaseModel):
    title: str
    description: str
    cause_category: str | None = None
    location_text: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    event_date: date | None = None
    event_time: time | None = None
    volunteers_needed: int = Field(default=1, ge=1)
    skills_required: list[str] = Field(default_factory=list)

    @field_validator("event_date")
    @classmethod
    def must_be_future(cls, value: date | None) -> date | None:
        if value is not None and value < date.today():
            raise ValueError("event_date must be in the future")
        return value


class OpportunityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str | None
    title: str
    description: str
    cause_category: str | None
    location_text: str | None
    location_lat: float | None
    location_lng: float | None
    event_date: date | None
    event_time: time | None
    volunteers_needed: int | None
    volunteers_signed: int
    skills_required: list[str] = Field(default_factory=list)
    source_url: str | None
    image_url: str | None = None
    is_scraped: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None


class OpportunityMapPin(BaseModel):
    id: str
    title: str
    cause_category: str | None
    location_lat: float | None
    location_lng: float | None


class HeatPoint(BaseModel):
    lat: float
    lng: float
    weight: float


class OpportunityListResponse(BaseModel):
    total: int
    items: list[OpportunityRead]
