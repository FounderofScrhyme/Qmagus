import logging
import uuid

import asyncpg
from fastapi import APIRouter, Depends, File, UploadFile

from app.auth.deps import get_current_user_id
from app.database import get_pool_dep
from app.exceptions import AppError
from app.repositories import messages as messages_repo
from app.repositories import sessions as sessions_repo
from app.routers.messages import _check_openai_message_rate_limits, _get_owned_active_session
from app.schemas.transcribe import TranscribeResponse
from app.services.openai_errors import format_openai_error
from app.services.openai_service import is_openai_configured
from app.services.transcribe_service import build_whisper_prompt, transcribe_audio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["transcribe"])

MAX_AUDIO_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "video/webm",
}


def _filename_for_upload(content_type: str | None) -> str:
    if content_type in {"audio/mp4", "audio/m4a"}:
        return "recording.m4a"
    if content_type in {"audio/mpeg", "audio/mp3"}:
        return "recording.mp3"
    if content_type in {"audio/wav", "audio/x-wav"}:
        return "recording.wav"
    return "recording.webm"


@router.post("/{session_id}/transcribe", response_model=TranscribeResponse)
async def transcribe_session_audio(
    session_id: uuid.UUID,
    audio: UploadFile = File(...),
    user_id: uuid.UUID = Depends(get_current_user_id),
    pool: asyncpg.Pool = Depends(get_pool_dep),
) -> TranscribeResponse:
    session = await _get_owned_active_session(
        pool=pool,
        session_id=session_id,
        user_id=user_id,
    )
    await _check_openai_message_rate_limits(pool=pool, user_id=user_id)

    if not is_openai_configured():
        raise AppError(
            "OPENAI_NOT_CONFIGURED",
            "OpenAI API key is not configured",
            503,
        )

    content_type = (audio.content_type or "").split(";")[0].strip().lower()
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise AppError(
            "UNSUPPORTED_AUDIO_FORMAT",
            f"Unsupported audio format: {content_type}",
            400,
        )

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise AppError("EMPTY_AUDIO", "Audio file is empty", 400)
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise AppError("AUDIO_TOO_LARGE", "Audio file is too large", 400)

    message_records = await messages_repo.list_messages_for_context(
        pool,
        session_id,
        limit=8,
    )
    context_messages = [
        {"role": record.role, "content": record.content}
        for record in message_records
        if record.role in {"user", "assistant"}
    ]
    prompt = build_whisper_prompt(
        scenario_text=session.scenario_text,
        messages=context_messages,
        setting=session.setting,
        user_role=session.user_role,
        ai_role=session.ai_role,
        goal=session.goal,
    )

    try:
        text = await transcribe_audio(
            audio_bytes=audio_bytes,
            filename=_filename_for_upload(content_type or audio.filename),
            prompt=prompt,
        )
    except Exception as exc:
        logger.exception("Failed to transcribe audio", extra={"user_id": str(user_id)})
        raise AppError("OPENAI_TRANSCRIBE_ERROR", format_openai_error(exc), 502) from exc

    if not text:
        raise AppError("EMPTY_TRANSCRIPT", "Could not transcribe audio", 400)

    logger.info("Audio transcribed", extra={"user_id": str(user_id)})
    return TranscribeResponse(text=text)
