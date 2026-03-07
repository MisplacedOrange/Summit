"""add geocode metadata columns to opportunities

Revision ID: 0003_geocode_metadata
Revises: 0002_cloudinary_images
Create Date: 2026-03-07
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_geocode_metadata"
down_revision = "0002_cloudinary_images"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("opportunities", sa.Column("geocode_source", sa.String(20), nullable=True))
    op.add_column("opportunities", sa.Column("geocode_confidence", sa.Float(), nullable=True))
    op.add_column("opportunities", sa.Column("geocoded_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("opportunities", "geocoded_at")
    op.drop_column("opportunities", "geocode_confidence")
    op.drop_column("opportunities", "geocode_source")
