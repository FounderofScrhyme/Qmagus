import json
from functools import lru_cache
from pathlib import Path

from app.config import settings
from app.schemas.feedback import FeedbackResponse
from app.services.openai_client import get_openai_client

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "feedback.txt"


@lru_cache
def load_feedback_prompt() -> str:
    # NOTE:
    # 会話用プロンプトと分離することで、改善時に
    # 「会話品質」と「添削品質」を個別にチューニングできるようにしている。
    return PROMPT_PATH.read_text(encoding="utf-8").strip()


def _build_transcript(messages: list[dict[str, str]]) -> str:
    lines: list[str] = []
    for message in messages:
        role = message["role"]
        content = message["content"]
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


async def generate_feedback(messages: list[dict[str, str]]) -> FeedbackResponse:
    client = get_openai_client()
    transcript = _build_transcript(messages)

    response = await client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": load_feedback_prompt()},
            {
                "role": "user",
                "content": (
                    "Analyze the following conversation transcript and return JSON only.\n\n"
                    f"{transcript}"
                ),
            },
        ],
        temperature=0.2,
    )

    content = response.choices[0].message.content or "{}"
    parsed = json.loads(content)
    return FeedbackResponse.model_validate(parsed)
