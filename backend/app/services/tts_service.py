from app.config import settings
from app.services.openai_client import get_openai_client
from app.services.scenario_service import resolve_openai_voice

ALLOWED_TTS_VOICES = frozenset({"onyx", "echo", "fable", "ash", "alloy", "nova", "shimmer", "coral"})


async def synthesize_speech(text: str, *, tts_voice: str | None = None) -> bytes:
    if tts_voice:
        voice = resolve_openai_voice(tts_voice)
    else:
        voice = settings.openai_tts_voice
    if voice not in ALLOWED_TTS_VOICES:
        voice = "onyx"

    client = get_openai_client()
    response = await client.audio.speech.create(
        model=settings.openai_tts_model,
        voice=voice,
        input=text,
        response_format="mp3",
    )
    return response.content
