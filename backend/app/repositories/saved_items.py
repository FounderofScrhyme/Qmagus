import uuid
from dataclasses import dataclass
from datetime import datetime

import asyncpg


@dataclass(frozen=True)
class SavedItemRecord:
    id: uuid.UUID
    user_id: uuid.UUID
    session_id: uuid.UUID
    type: str
    original: str
    corrected: str
    explanation: str
    created_at: datetime


def _to_saved_item(row: asyncpg.Record) -> SavedItemRecord:
    return SavedItemRecord(
        id=row["id"],
        user_id=row["user_id"],
        session_id=row["session_id"],
        type=row["type"],
        original=row["original"],
        corrected=row["corrected"],
        explanation=row["explanation"],
        created_at=row["created_at"],
    )


async def create_saved_item(
    pool: asyncpg.Pool,
    *,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    type_: str,
    original: str,
    corrected: str,
    explanation: str,
) -> SavedItemRecord:
    row = await pool.fetchrow(
        """
        INSERT INTO saved_items (user_id, session_id, type, original, corrected, explanation)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, user_id, session_id, type, original, corrected, explanation, created_at
        """,
        user_id,
        session_id,
        type_,
        original,
        corrected,
        explanation,
    )
    if row is None:
        raise RuntimeError("Failed to create saved item")
    return _to_saved_item(row)


async def list_saved_items(
    pool: asyncpg.Pool,
    *,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
) -> list[SavedItemRecord]:
    rows = await pool.fetch(
        """
        SELECT id, user_id, session_id, type, original, corrected, explanation, created_at
        FROM saved_items
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        """,
        user_id,
        limit,
        offset,
    )
    return [_to_saved_item(row) for row in rows]


async def delete_saved_item(
    pool: asyncpg.Pool,
    *,
    item_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    result = await pool.execute(
        """
        DELETE FROM saved_items
        WHERE id = $1 AND user_id = $2
        """,
        item_id,
        user_id,
    )
    return result.endswith("1")
