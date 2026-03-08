"""add is_scraped column to opportunities

Revision ID: 0004_add_is_scraped
Revises: 0003_geocode_metadata
Create Date: 2026-03-07
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_add_is_scraped"
down_revision = "0003_geocode_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "opportunities",
        sa.Column("is_scraped", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("opportunities", "is_scraped")
