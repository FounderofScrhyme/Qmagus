from openai import AsyncOpenAI

from app.config import settings


def get_openai_client() -> AsyncOpenAI:
    # NOTE: Do not cache the client. API keys can change via mounted .env in Docker dev.
    return AsyncOpenAI(api_key=settings.openai_api_key, max_retries=5)
