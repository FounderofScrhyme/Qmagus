"""add_constraints_and_rate_limit_buckets

Revision ID: 20260625_000004
Revises: 20250621_000003
Create Date: 2026-06-25
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260625_000004"
down_revision: Union[str, None] = "20250621_000003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE conversation_sessions
        ADD CONSTRAINT chk_conversation_sessions_status
        CHECK (status IN ('active', 'completed'));
        """
    )
    op.execute(
        """
        ALTER TABLE messages
        ADD CONSTRAINT chk_messages_role
        CHECK (role IN ('user', 'assistant'));
        """
    )
    op.execute(
        """
        ALTER TABLE saved_items
        ADD CONSTRAINT chk_saved_items_type
        CHECK (type IN ('grammar', 'vocabulary', 'naturalness', 'pronunciation'));
        """
    )
    op.execute(
        """
        CREATE TABLE rate_limit_buckets (
            scope VARCHAR(100) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            bucket BIGINT NOT NULL,
            count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (scope, subject, bucket)
        );
        """
    )
    op.execute(
        """
        CREATE INDEX idx_rate_limit_buckets_updated_at
        ON rate_limit_buckets (updated_at DESC);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_rate_limit_buckets_updated_at;")
    op.execute("DROP TABLE IF EXISTS rate_limit_buckets;")
    op.execute(
        "ALTER TABLE saved_items DROP CONSTRAINT IF EXISTS chk_saved_items_type;"
    )
    op.execute(
        "ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_role;"
    )
    op.execute(
        "ALTER TABLE conversation_sessions DROP CONSTRAINT IF EXISTS chk_conversation_sessions_status;"
    )
