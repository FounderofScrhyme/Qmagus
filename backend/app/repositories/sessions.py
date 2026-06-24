import uuid
from dataclasses import dataclass
from datetime import datetime

import asyncpg


@dataclass(frozen=True)
class SessionRecord:
    id: uuid.UUID
    user_id: uuid.UUID
    scenario_text: str
    status: str
    created_at: datetime
    completed_at: datetime | None


@dataclass(frozen=True)
class MessageRecord:
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime


def _to_session_record(row: asyncpg.Record) -> SessionRecord:
    return SessionRecord(
        id=row["id"],
        user_id=row["user_id"],
        scenario_text=row["scenario_text"],
        status=row["status"],
        created_at=row["created_at"],
        completed_at=row["completed_at"],
    )


def _to_message_record(row: asyncpg.Record) -> MessageRecord:
    return MessageRecord(
        id=row["id"],
        role=row["role"],
        content=row["content"],
        created_at=row["created_at"],
    )


async def create_session(
    pool: asyncpg.Pool,
    user_id: uuid.UUID,
    scenario_text: str,
) -> SessionRecord:
    row = await pool.fetchrow(
        """
        INSERT INTO conversation_sessions (user_id, scenario_text)
        VALUES ($1, $2)
        RETURNING id, user_id, scenario_text, status, created_at, completed_at
        """,
        user_id,
        scenario_text,
    )
    if row is None:
        raise RuntimeError("Failed to create session")
    return _to_session_record(row)


async def list_sessions(
    pool: asyncpg.Pool,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
) -> list[SessionRecord]:
    rows = await pool.fetch(
        """
        SELECT id, user_id, scenario_text, status, created_at, completed_at
        FROM conversation_sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        """,
        user_id,
        limit,
        offset,
    )
    return [_to_session_record(row) for row in rows]


async def get_session(
    pool: asyncpg.Pool,
    session_id: uuid.UUID,
) -> SessionRecord | None:
    row = await pool.fetchrow(
        """
        SELECT id, user_id, scenario_text, status, created_at, completed_at
        FROM conversation_sessions
        WHERE id = $1
        """,
        session_id,
    )
    return _to_session_record(row) if row else None


async def list_messages(
    pool: asyncpg.Pool,
    session_id: uuid.UUID,
    limit: int,
    offset: int,
) -> list[MessageRecord]:
    rows = await pool.fetch(
        """
        SELECT id, role, content, created_at
        FROM messages
        WHERE session_id = $1
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3
        """,
        session_id,
        limit,
        offset,
    )
    return [_to_message_record(row) for row in rows]


async def complete_session(
    pool: asyncpg.Pool,
    session_id: uuid.UUID,
) -> SessionRecord | None:
    row = await pool.fetchrow(
        """
        UPDATE conversation_sessions
        SET status = 'completed', completed_at = now()
        WHERE id = $1 AND status = 'active'
        RETURNING id, user_id, scenario_text, status, created_at, completed_at
        """,
        session_id,
    )
    return _to_session_record(row) if row else None
