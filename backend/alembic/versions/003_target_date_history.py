"""Add target date history table

Revision ID: 003
Revises: 002
Create Date: 2026-03-02

Changes:
- Add initial_target_closure_date column to activities
- Create target_date_history table with revision tracking
"""
from typing import Sequence, Union
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE activities ADD COLUMN initial_target_closure_date DATE")
    op.execute("UPDATE activities SET initial_target_closure_date = target_closure_date WHERE target_closure_date IS NOT NULL")
    op.execute("""
        CREATE TABLE target_date_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
            old_date DATE,
            new_date DATE,
            remarks TEXT,
            changed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            changed_at TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX idx_tdh_activity_id ON target_date_history(activity_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_tdh_activity_id")
    op.execute("DROP TABLE IF EXISTS target_date_history")
    op.execute("ALTER TABLE activities DROP COLUMN IF EXISTS initial_target_closure_date")
