from openai import APIStatusError, AuthenticationError, PermissionDeniedError, RateLimitError


def _error_code(exc: APIStatusError) -> str | None:
    body = exc.body
    if not isinstance(body, dict):
        return None
    error = body.get("error")
    if isinstance(error, dict):
        code = error.get("code")
        return str(code) if code is not None else None
    return None


def _error_message(exc: APIStatusError) -> str:
    body = exc.body
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str):
                return message.lower()
    return str(exc).lower()


def format_openai_error(exc: Exception) -> str:
    if isinstance(exc, AuthenticationError):
        return "OpenAI API key is invalid. Check OPENAI_API_KEY in .env."

    if isinstance(exc, PermissionDeniedError):
        return "OpenAI API access is denied. Check your project permissions."

    if isinstance(exc, RateLimitError):
        code = _error_code(exc)
        message = _error_message(exc)
        if (
            code == "insufficient_quota"
            or "insufficient_quota" in message
            or "exceeded your current quota" in message
        ):
            return (
                "OpenAI API quota exceeded. Add billing credits at "
                "https://platform.openai.com/settings/organization/billing"
            )
        return (
            "OpenAI API temporary rate limit exceeded. "
            "Wait 1-2 minutes and try again."
        )

    if isinstance(exc, APIStatusError):
        if exc.status_code == 404:
            return "The configured OpenAI model is unavailable. Check OPENAI_MODEL in .env."
        message = getattr(exc, "message", None) or str(exc)
        return f"OpenAI API error: {message}"

    return "Failed to generate assistant reply"
