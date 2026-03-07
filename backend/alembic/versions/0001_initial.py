"""initial

Revision ID: 0001_initial
Revises:
Create Date: 2026-03-07
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("auth0_id", sa.Text(), nullable=False, unique=True),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("full_name", sa.Text(), nullable=True),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="student"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "user_preferences",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("interests", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("skills", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lng", sa.Float(), nullable=True),
        sa.Column("radius_km", sa.Integer(), nullable=False, server_default="25"),
        sa.Column("embedding", sa.JSON(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("website", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "opportunities",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("cause_category", sa.String(length=80), nullable=True),
        sa.Column("location_text", sa.Text(), nullable=True),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lng", sa.Float(), nullable=True),
        sa.Column("event_date", sa.Date(), nullable=True),
        sa.Column("event_time", sa.Time(), nullable=True),
        sa.Column("volunteers_needed", sa.Integer(), nullable=True),
        sa.Column("volunteers_signed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skills_required", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("is_scraped", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("embedding", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "volunteer_records",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("opportunity_id", sa.String(length=36), sa.ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="signed_up"),
        sa.Column("hours_logged", sa.Float(), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "opportunity_id", name="uq_user_opportunity"),
    )

    op.create_table(
        "saved_opportunities",
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("opportunity_id", sa.String(length=36), sa.ForeignKey("opportunities.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("saved_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("saved_opportunities")
    op.drop_table("volunteer_records")
    op.drop_table("opportunities")
    op.drop_table("organizations")
    op.drop_table("user_preferences")
    op.drop_table("users")
