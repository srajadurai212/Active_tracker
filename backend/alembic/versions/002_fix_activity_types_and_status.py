"""Fix activity_type column and add Completed status

Revision ID: 002
Revises: 001
Create Date: 2026-03-02

Changes:
- activity_type: convert from PostgreSQL enum to VARCHAR(255) so any free-text
  type from the Excel (Offshore, Documentation, Project, R&D, POC, etc.) can
  be stored directly instead of being collapsed to 'Other'.
- activitystatus: add 'Completed' value.
"""
from typing import Sequence, Union
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE activities ALTER COLUMN activity_type TYPE VARCHAR(255) USING activity_type::text")
    op.execute("DROP TYPE IF EXISTS activitytype")
    op.execute("ALTER TYPE activitystatus ADD VALUE IF NOT EXISTS 'Completed'")


def downgrade() -> None:
    op.execute("""
        -- Remove Completed from activitystatus (cannot remove enum values in PG < 16,
        -- so we recreate the enum without it)
        ALTER TABLE activities
            ALTER COLUMN status TYPE VARCHAR(255) USING status::text;

        DROP TYPE IF EXISTS activitystatus;

        CREATE TYPE activitystatus AS ENUM ('Open', 'In Progress', 'Closed', 'On-Hold');

        ALTER TABLE activities
            ALTER COLUMN status TYPE activitystatus
            USING status::activitystatus;

        -- Recreate activity_type enum (data loss: values not in enum become NULL)
        CREATE TYPE activitytype AS ENUM ('Call', 'Meeting', 'Email', 'Demo', 'Proposal', 'Follow-up', 'Other');

        ALTER TABLE activities
            ALTER COLUMN activity_type TYPE activitytype
            USING CASE
                WHEN activity_type IN ('Call','Meeting','Email','Demo','Proposal','Follow-up','Other')
                THEN activity_type::activitytype
                ELSE NULL
            END;
    """)
