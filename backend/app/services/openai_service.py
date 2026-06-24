from collections.abc import AsyncGenerator
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.config import settings

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "conversation.txt"


def is_openai_configured() -> bool:
    key = settings.openai_api_key.strip()
    # NOTE:
    # フェーズ4では SSE を返すため、レスポンス開始後に設定エラーが発生すると
    # HTTP ステータスで失敗を返せない。先に設定妥当性を判定して 4xx/5xx を返せるようにする。
    return bool(key) and not key.startswith("sk-your-openai-api-key")


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
    user_content: str,
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
    messages.append({"role": "user", "content": user_content})
    return messages


async def stream_assistant_reply(
    *,
    scenario_text: str,
    history: list[dict[str, str]],
    user_content: str,
) -> AsyncGenerator[str, None]:
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    messages = _build_messages(
        scenario_text=scenario_text,
        history=history,
        user_content=user_content,
    )

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
