# Whisper prompt is limited to ~224 tokens; keep context concise.
WHISPER_PROMPT_MAX_CHARS = 600


def build_whisper_prompt(
    *,
    scenario_text: str,
    messages: list[dict[str, str]],
    setting: str | None = None,
    user_role: str | None = None,
    ai_role: str | None = None,
    goal: str | None = None,
) -> str:
    parts: list[str] = []
    if setting and user_role and ai_role and goal:
        parts.append(
            f"{setting}. Learner role: {user_role}. Partner role: {ai_role}. Goal: {goal}"[:300]
        )
    else:
        scenario = scenario_text.strip().replace("\n", " ")
        if scenario:
            parts.append(scenario[:300])

    for message in messages[-8:]:
        role = message.get("role", "")
        content = message.get("content", "").strip().replace("\n", " ")
        if not content:
            continue
        parts.append(f"{role}: {content[:120]}")

    prompt = ". ".join(parts)
    return prompt[:WHISPER_PROMPT_MAX_CHARS]


async def transcribe_audio(
    *,
    audio_bytes: bytes,
    filename: str,
    prompt: str,
) -> str:
    import io

    from app.config import settings
    from app.services.openai_client import get_openai_client

    client = get_openai_client()
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    transcript = await client.audio.transcriptions.create(
        model=settings.openai_transcribe_model,
        file=audio_file,
        language="en",
        prompt=prompt,
    )
    return transcript.text.strip()
