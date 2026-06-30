import logging
import uuid

import asyncpg
from fastapi import APIRouter, Depends, Query

from app.auth.deps import get_current_user_id
from app.config import settings
from app.database import get_pool_dep
from app.exceptions import AppError
from app.repositories import sessions as sessions_repo
from app.schemas.sessions import MessageRead, SessionCreate, SessionDetailRead, SessionRead
from app.services.scenario_service import TtsVoiceGender, format_scenario_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _to_session_read(row: sessions_repo.SessionRecord) -> SessionRead:
    return SessionRead(
        id=row.id,
        scenario_text=row.scenario_text,
        setting=row.setting,
        user_role=row.user_role,
        ai_role=row.ai_role,
        goal=row.goal,
        tts_voice=TtsVoiceGender(row.tts_voice),
        status=row.status,
        created_at=row.created_at,
        completed_at=row.completed_at,
    )


def _to_message_read(row: sessions_repo.MessageRecord) -> MessageRead:
    return MessageRead(
        id=row.id,
        role=row.role,
        content=row.content,
        created_at=row.created_at,
    )


async def _get_owned_session(
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    pool: asyncpg.Pool,
) -> sessions_repo.SessionRecord:
    session = await sessions_repo.get_session(pool, session_id)
    if session is None:
        raise AppError("SESSION_NOT_FOUND", "Session not found", 404)
    if session.user_id != user_id:
        raise AppError("FORBIDDEN", "You do not have access to this session", 403)
    return session


@router.post("", response_model=SessionRead, status_code=201)
async def create_session(
    body: SessionCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    pool: asyncpg.Pool = Depends(get_pool_dep),
) -> SessionRead:
    scenario_text = format_scenario_text(
        setting=body.setting,
        user_role=body.user_role,
        ai_role=body.ai_role,
        goal=body.goal,
    )
    row = await sessions_repo.create_session(
        pool,
        user_id,
        scenario_text=scenario_text,
        setting=body.setting,
        user_role=body.user_role,
        ai_role=body.ai_role,
        goal=body.goal,
        tts_voice=body.tts_voice.value,
    )
    logger.info("Session created", extra={"user_id": str(user_id)})
    return _to_session_read(row)


@router.get("", response_model=list[SessionRead])
async def list_sessions(
    user_id: uuid.UUID = Depends(get_current_user_id),
    limit: int = Query(
        default=settings.session_list_default_limit,
        ge=1,
        le=settings.session_list_max_limit,
    ),
    offset: int = Query(default=0, ge=0),
    pool: asyncpg.Pool = Depends(get_pool_dep),
) -> list[SessionRead]:
    rows = await sessions_repo.list_sessions(pool, user_id, limit=limit, offset=offset)
    return [_to_session_read(row) for row in rows]


@router.get("/{session_id}", response_model=SessionDetailRead)
async def get_session(
    session_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    message_limit: int = Query(
        default=settings.message_list_default_limit,
        ge=1,
        le=settings.message_list_max_limit,
        alias="limit",
    ),
    message_offset: int = Query(default=0, ge=0, alias="offset"),
    pool: asyncpg.Pool = Depends(get_pool_dep),
) -> SessionDetailRead:
    session = await _get_owned_session(session_id, user_id, pool)
    messages = await sessions_repo.list_messages(
        pool,
        session_id,
        limit=message_limit,
        offset=message_offset,
    )
    return SessionDetailRead(
        **_to_session_read(session).model_dump(),
        messages=[_to_message_read(message) for message in messages],
    )


@router.post("/{session_id}/complete", response_model=SessionRead)
async def complete_session(
    session_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    pool: asyncpg.Pool = Depends(get_pool_dep),
) -> SessionRead:
    session = await _get_owned_session(session_id, user_id, pool)

    if session.status == "completed":
        raise AppError(
            "SESSION_ALREADY_COMPLETED",
            "Session is already completed",
            400,
        )

    row = await sessions_repo.complete_session(pool, session_id)
    if row is None:
        raise AppError("SESSION_NOT_FOUND", "Session not found", 404)

    logger.info("Session completed", extra={"user_id": str(user_id)})
    return _to_session_read(row)
