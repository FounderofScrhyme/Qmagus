"""add_indexes

Revision ID: 20250621_000003
Revises: 20250621_000002
Create Date: 2025-06-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20250621_000003"
down_revision: Union[str, None] = "20250621_000002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE INDEX idx_sessions_user_id_created_at
        ON conversation_sessions (user_id, created_at DESC);
    """)
    op.execute("""
        CREATE INDEX idx_messages_session_id_created_at
        ON messages (session_id, created_at ASC);
    """)
    op.execute("""
        CREATE INDEX idx_saved_items_user_id_created_at
        ON saved_items (user_id, created_at DESC);
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_saved_items_user_id_created_at;")
    op.execute("DROP INDEX IF EXISTS idx_messages_session_id_created_at;")
    op.execute("DROP INDEX IF EXISTS idx_sessions_user_id_created_at;")
