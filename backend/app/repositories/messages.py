import uuid
from dataclasses import dataclass
from datetime import datetime

import asyncpg


@dataclass(frozen=True)
class MessageRecord:
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    created_at: datetime


def _to_message_record(row: asyncpg.Record) -> MessageRecord:
    return MessageRecord(
        id=row["id"],
        session_id=row["session_id"],
        role=row["role"],
        content=row["content"],
        created_at=row["created_at"],
    )


async def create_message(
    pool: asyncpg.Pool,
    session_id: uuid.UUID,
    role: str,
    content: str,
) -> MessageRecord:
    row = await pool.fetchrow(
        """
        INSERT INTO messages (session_id, role, content)
        VALUES ($1, $2, $3)
        RETURNING id, session_id, role, content, created_at
        """,
        session_id,
        role,
        content,
    )
    if row is None:
        raise RuntimeError("Failed to create message")
    return _to_message_record(row)


async def list_messages_for_context(
    pool: asyncpg.Pool,
    session_id: uuid.UUID,
    limit: int = 20,
) -> list[MessageRecord]:
    # NOTE:
    # OpenAI に渡す履歴は無制限にするとトークンとコストが増えるため、
    # 直近N件だけを取得して「会話の連続性」と「コスト/遅延」のバランスを取る。
    rows = await pool.fetch(
        """
        SELECT id, session_id, role, content, created_at
        FROM (
            SELECT id, session_id, role, content, created_at
            FROM messages
            WHERE session_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        ) recent
        ORDER BY created_at ASC
        """,
        session_id,
        limit,
    )
    return [_to_message_record(row) for row in rows]


async def list_messages_for_feedback(
    pool: asyncpg.Pool,
    session_id: uuid.UUID,
) -> list[MessageRecord]:
    # NOTE:
    # フィードバック品質は会話全体の流れに依存するため、
    # ここではページングせず全件を時系列で取得して評価に渡す。
    rows = await pool.fetch(
        """
        SELECT id, session_id, role, content, created_at
        FROM messages
        WHERE session_id = $1
        ORDER BY created_at ASC
        """,
        session_id,
    )
    return [_to_message_record(row) for row in rows]
