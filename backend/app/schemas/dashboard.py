from pydantic import BaseModel


class DashboardSummary(BaseModel):
    upcoming_count: int
    completed_count: int
    total_hours: float
