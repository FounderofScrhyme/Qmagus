import json
import logging
import uuid
from collections.abc import AsyncGenerator

import asyncpg
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.auth.deps import get_current_user_id
from app.config import settings
from app.database import get_pool_dep
from app.exceptions import AppError
from app.rate_limit import check_rate_limit
from app.repositories import messages as messages_repo
from app.repositories import sessions as sessions_repo
from app.schemas.messages import MessageCreate
from app.services.openai_service import is_openai_configured, stream_assistant_reply

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["messages"])


def _format_sse_event(event: str, data: dict[str, str]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _get_owned_active_session(
    *,
    pool: asyncpg.Pool,
    session_id: uuid.UUID,
    user_id: uuid.UUID,
) -> sessions_repo.SessionRecord:
    # NOTE:
    # 会話 API は「存在確認」「所有権」「状態(active/completed)」を
    # まとめて満たした時だけ処理を進める必要がある。
    # 条件を1箇所に閉じ込めることで、将来の状態ルール追加時も分岐漏れを防げる。
    session = await sessions_repo.get_session(pool, session_id)
    if session is None:
        raise AppError("SESSION_NOT_FOUND", "Session not found", 404)
    if session.user_id != user_id:
        raise AppError("FORBIDDEN", "You do not have access to this session", 403)
    if session.status != "active":
        raise AppError("SESSION_NOT_ACTIVE", "Session is not active", 400)
    return session


@router.post("/{session_id}/messages")
async def create_message_and_stream_reply(
    session_id: uuid.UUID,
    body: MessageCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    pool: asyncpg.Pool = Depends(get_pool_dep),
) -> StreamingResponse:
    session = await _get_owned_active_session(
        pool=pool,
        session_id=session_id,
        user_id=user_id,
    )
    user_key = str(user_id)
    limited_minute = await check_rate_limit(
        pool=pool,
        scope="openai:messages:minute",
        subject=user_key,
        limit=settings.openai_message_rate_limit_per_minute,
        window_seconds=60,
    )
    if limited_minute:
        raise AppError(
            "RATE_LIMITED",
            "Message rate limit exceeded. Please try again later.",
            429,
        )
    limited_day = await check_rate_limit(
        pool=pool,
        scope="openai:messages:day",
        subject=user_key,
        limit=settings.openai_message_rate_limit_per_day,
        window_seconds=86400,
    )
    if limited_day:
        raise AppError(
            "RATE_LIMITED_DAILY",
            "Daily message limit exceeded.",
            429,
        )

    if not is_openai_configured():
        raise AppError(
            "OPENAI_NOT_CONFIGURED",
            "OpenAI API key is not configured",
            503,
        )

    # NOTE:
    # ユーザー発話はストリーム開始前に確定保存する。
    # こうすることで OpenAI 側で失敗しても「ユーザーが送った事実」は失われず、
    # 再送や障害調査時に会話履歴の整合性を保てる。
    await messages_repo.create_message(
        pool=pool,
        session_id=session_id,
        role="user",
        content=body.content,
    )

    history_records = await messages_repo.list_messages_for_context(
        pool=pool,
        session_id=session_id,
        limit=20,
    )
    history = [
        {"role": message.role, "content": message.content}
        for message in history_records
        if message.role in {"user", "assistant"}
    ]

    async def event_generator() -> AsyncGenerator[str, None]:
        assistant_parts: list[str] = []

        try:
            async for delta in stream_assistant_reply(
                scenario_text=session.scenario_text,
                history=history,
                user_content=body.content,
            ):
                assistant_parts.append(delta)
                yield _format_sse_event("chunk", {"content": delta})
        except Exception:
            logger.exception("Failed to stream assistant reply", extra={"user_id": str(user_id)})
            yield _format_sse_event(
                "error",
                {"message": "Failed to generate assistant reply"},
            )
            return

        assistant_text = "".join(assistant_parts).strip()
        if not assistant_text:
            yield _format_sse_event(
                "error",
                {"message": "Assistant response was empty"},
            )
            return

        assistant_message = await messages_repo.create_message(
            pool=pool,
            session_id=session_id,
            role="assistant",
            content=assistant_text,
        )
        yield _format_sse_event("done", {"message_id": str(assistant_message.id)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            # NOTE:
            # SSE をリバースプロキシ経由で安定配信するために、
            # バッファリング無効化と keep-alive を明示して途切れを防ぐ。
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
