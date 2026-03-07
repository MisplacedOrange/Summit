from fastapi import APIRouter

from app.api.v1 import auth, dashboard, opportunities, organizations, recommendations, users


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(opportunities.router, prefix="/opportunities", tags=["opportunities"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
