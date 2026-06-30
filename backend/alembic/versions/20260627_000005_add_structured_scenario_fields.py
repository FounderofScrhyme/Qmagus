"""add_structured_scenario_fields

Revision ID: 20260627_000005
Revises: 20260625_000004
Create Date: 2026-06-27
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260627_000005"
down_revision: Union[str, None] = "20260625_000004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE conversation_sessions
            ADD COLUMN setting TEXT,
            ADD COLUMN user_role TEXT,
            ADD COLUMN ai_role TEXT,
            ADD COLUMN goal TEXT,
            ADD COLUMN tts_voice VARCHAR(10) NOT NULL DEFAULT 'male';
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE conversation_sessions
            DROP COLUMN IF EXISTS setting,
            DROP COLUMN IF EXISTS user_role,
            DROP COLUMN IF EXISTS ai_role,
            DROP COLUMN IF EXISTS goal,
            DROP COLUMN IF EXISTS tts_voice;
    """)
