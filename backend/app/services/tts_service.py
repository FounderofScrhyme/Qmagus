from app.config import settings
from app.services.openai_client import get_openai_client

ALLOWED_TTS_VOICES = frozenset({"onyx", "echo", "fable", "ash", "alloy", "nova", "shimmer", "coral"})


async def synthesize_speech(text: str) -> bytes:
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
