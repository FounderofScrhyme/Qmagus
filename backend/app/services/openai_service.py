from collections.abc import AsyncGenerator
from functools import lru_cache
from pathlib import Path

from app.config import settings
from app.services.openai_client import get_openai_client

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "conversation.txt"


def is_openai_configured() -> bool:
    key = settings.openai_api_key.strip()
    # NOTE:
    # フェーズ4では SSE を返すため、レスポンス開始後に設定エラーが発生すると
    # HTTP ステータスで失敗を返せない。先に設定妥当性を判定して 4xx/5xx を返せるようにする。
    if not key:
        return False
    placeholder_markers = (
        "sk-your-openai-api-key",
        "sk-proj-xxxxxxxx",
    )
    return not any(marker in key for marker in placeholder_markers)


@lru_cache
def load_conversation_prompt() -> str:
    # NOTE:
    # プロンプトをコードに直書きせずファイル分離することで、
    # プロンプト改善時にロジックと差分が混ざらずレビューしやすくなる。
    return PROMPT_PATH.read_text(encoding="utf-8").strip()


def _build_messages(
    *,
    scenario_text: str,
    history: list[dict[str, str]],
) -> list[dict[str, str]]:
    system_prompt = load_conversation_prompt()

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt},
        {
            "role": "system",
            "content": (
                "Current scenario context:\n"
                f"{scenario_text}\n\n"
                "Stay in-character as the conversation partner."
            ),
        },
    ]
    messages.extend(history)
    return messages


def _build_opening_messages(*, scenario_text: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": load_conversation_prompt()},
        {
            "role": "system",
            "content": (
                "Current scenario context:\n"
                f"{scenario_text}\n\n"
                "Stay in-character as the conversation partner. "
                "You speak first to open the conversation."
            ),
        },
        {
            "role": "user",
            "content": (
                "Start the conversation now. Greet the learner naturally for this scenario, "
                "speak first in 1-2 sentences, and invite them to respond."
            ),
        },
    ]


async def _stream_chat_completion(
    messages: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    client = get_openai_client()
    stream = await client.chat.completions.create(
        model=settings.openai_model,
        messages=messages,
        temperature=0.7,
        stream=True,
    )

    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content
        if not delta:
            continue
        yield delta


async def stream_assistant_reply(
    *,
    scenario_text: str,
    history: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    messages = _build_messages(
        scenario_text=scenario_text,
        history=history,
    )
    async for delta in _stream_chat_completion(messages):
        yield delta


async def stream_opening_reply(*, scenario_text: str) -> AsyncGenerator[str, None]:
    messages = _build_opening_messages(scenario_text=scenario_text)
    async for delta in _stream_chat_completion(messages):
        yield delta
