import logging

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.auth.deps import get_current_user_id
from app.exceptions import AppError
from app.schemas.tts import TTSRequest
from app.services.openai_errors import format_openai_error
from app.services.openai_service import is_openai_configured
from app.services.tts_service import synthesize_speech

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.post("")
async def create_speech(
    body: TTSRequest,
    _user_id=Depends(get_current_user_id),
) -> Response:
    if not is_openai_configured():
        raise AppError(
            "OPENAI_NOT_CONFIGURED",
            "OpenAI API key is not configured",
            503,
        )

    try:
        audio = await synthesize_speech(body.text)
    except Exception as exc:
        logger.exception("Failed to synthesize speech")
        raise AppError("OPENAI_TTS_ERROR", format_openai_error(exc), 502) from exc

    return Response(content=audio, media_type="audio/mpeg")
