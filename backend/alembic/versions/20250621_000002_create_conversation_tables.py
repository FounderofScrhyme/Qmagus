"""create_conversation_tables

Revision ID: 20250621_000002
Revises: 20250621_000001
Create Date: 2025-06-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20250621_000002"
down_revision: Union[str, None] = "20250621_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE conversation_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            scenario_text TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            completed_at TIMESTAMPTZ
        );
    """)

    op.execute("""
        CREATE TABLE messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE saved_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
            type VARCHAR(20) NOT NULL,
            original TEXT NOT NULL,
            corrected TEXT NOT NULL,
            explanation TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS saved_items;")
    op.execute("DROP TABLE IF EXISTS messages;")
    op.execute("DROP TABLE IF EXISTS conversation_sessions;")
