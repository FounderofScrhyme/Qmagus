import uuid
from dataclasses import dataclass
from datetime import datetime

import asyncpg


@dataclass(frozen=True)
class SessionRecord:
    id: uuid.UUID
    user_id: uuid.UUID
    scenario_text: str
    setting: str | None
    user_role: str | None
    ai_role: str | None
    goal: str | None
    tts_voice: str
    status: str
    created_at: datetime
    completed_at: datetime | None


@dataclass(frozen=True)
class MessageRecord:
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime


_SESSION_COLUMNS = """
    id, user_id, scenario_text, setting, user_role, ai_role, goal, tts_voice,
    status, created_at, completed_at
"""


def _to_session_record(row: asyncpg.Record) -> SessionRecord:
    return SessionRecord(
        id=row["id"],
        user_id=row["user_id"],
        scenario_text=row["scenario_text"],
        setting=row["setting"],
        user_role=row["user_role"],
        ai_role=row["ai_role"],
        goal=row["goal"],
        tts_voice=row["tts_voice"],
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
    *,
    scenario_text: str,
    setting: str,
    user_role: str,
    ai_role: str,
    goal: str,
    tts_voice: str,
) -> SessionRecord:
    row = await pool.fetchrow(
        f"""
        INSERT INTO conversation_sessions (
            user_id, scenario_text, setting, user_role, ai_role, goal, tts_voice
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING {_SESSION_COLUMNS}
        """,
        user_id,
        scenario_text,
        setting,
        user_role,
        ai_role,
        goal,
        tts_voice,
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
        f"""
        SELECT {_SESSION_COLUMNS}
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
        f"""
        SELECT {_SESSION_COLUMNS}
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
        f"""
        UPDATE conversation_sessions
        SET status = 'completed', completed_at = now()
        WHERE id = $1 AND status = 'active'
        RETURNING {_SESSION_COLUMNS}
        """,
        session_id,
    )
    return _to_session_record(row) if row else None
