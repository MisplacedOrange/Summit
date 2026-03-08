from pydantic import BaseModel, Field

from app.schemas.opportunity import OpportunityRead


class RecommendationItem(BaseModel):
    opportunity: OpportunityRead
    score: float = Field(ge=0)
    reason: str = ""


class RecommendationResponse(BaseModel):
    items: list[RecommendationItem]
