"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-02
"""

from typing import Sequence, Union
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable extension for UUID
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # ENUM Types
    op.execute("CREATE TYPE userrole AS ENUM ('admin', 'user')")
    op.execute("CREATE TYPE activitytype AS ENUM ('Call', 'Meeting', 'Email', 'Demo', 'Proposal', 'Follow-up', 'Other')")
    op.execute("CREATE TYPE activitystatus AS ENUM ('Open', 'In Progress', 'Closed', 'On-Hold')")
    op.execute("CREATE TYPE auditaction AS ENUM ('CREATE', 'UPDATE', 'DELETE')")

    # USERS TABLE
    op.execute("""
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL UNIQUE,
            hashed_password VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            role userrole NOT NULL DEFAULT 'user',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_by_id UUID REFERENCES users(id) ON DELETE SET NULL
        )
    """)
    op.execute("CREATE INDEX ix_users_email ON users(email)")

    # ACTIVITIES TABLE
    op.execute("""
        CREATE TABLE activities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_name VARCHAR(255) NOT NULL,
            entry_date DATE NOT NULL,
            action_item TEXT NOT NULL,
            assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
            product_domain VARCHAR(255),
            activity_type activitytype,
            target_closure_date DATE,
            actual_closure_date DATE,
            status activitystatus NOT NULL DEFAULT 'Open',
            remarks TEXT,
            created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            deleted_at TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX ix_activities_assigned_to_id ON activities(assigned_to_id)")
    op.execute("CREATE INDEX ix_activities_status ON activities(status)")
    op.execute("CREATE INDEX ix_activities_entry_date ON activities(entry_date)")

    # AUDIT LOGS TABLE
    op.execute("""
        CREATE TABLE audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            table_name VARCHAR(100) NOT NULL,
            record_id UUID NOT NULL,
            action auditaction NOT NULL,
            old_values JSON,
            new_values JSON,
            changed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            ip_address VARCHAR(45)
        )
    """)
    op.execute("CREATE INDEX ix_audit_logs_table_record ON audit_logs(table_name, record_id)")
    op.execute("CREATE INDEX ix_audit_logs_changed_by_id ON audit_logs(changed_by_id)")
    op.execute("CREATE INDEX ix_audit_logs_changed_at ON audit_logs(changed_at)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS audit_logs")
    op.execute("DROP TABLE IF EXISTS activities")
    op.execute("DROP TABLE IF EXISTS users")

    op.execute("DROP TYPE IF EXISTS auditaction")
    op.execute("DROP TYPE IF EXISTS activitystatus")
    op.execute("DROP TYPE IF EXISTS activitytype")
    op.execute("DROP TYPE IF EXISTS userrole")