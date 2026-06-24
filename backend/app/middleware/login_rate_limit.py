from collections import defaultdict, deque
from time import monotonic

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.context import request_id_ctx


class LoginRateLimitMiddleware:
    def __init__(self, app: ASGIApp, max_attempts: int, window_seconds: int) -> None:
        self.app = app
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, deque[float]] = defaultdict(deque)

    def _client_key(self, scope: Scope) -> str:
        headers = {
            key.decode("latin-1").lower(): value.decode("latin-1")
            for key, value in scope.get("headers", [])
        }
        xff = headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()

        client = scope.get("client")
        if client:
            return str(client[0])
        return "unknown"

    def _is_rate_limited(self, key: str) -> bool:
        now = monotonic()
        bucket = self._attempts[key]
        threshold = now - self.window_seconds

        while bucket and bucket[0] < threshold:
            bucket.popleft()

        if len(bucket) >= self.max_attempts:
            return True

        bucket.append(now)
        return False

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if scope.get("path") == "/auth/jwt/login" and scope.get("method") == "POST":
            client_key = self._client_key(scope)
            if self._is_rate_limited(client_key):
                body: dict[str, object] = {
                    "error": {
                        "code": "TOO_MANY_REQUESTS",
                        "message": "Too many login attempts. Please try again later.",
                    }
                }
                if request_id := request_id_ctx.get():
                    body["request_id"] = request_id

                response = JSONResponse(status_code=429, content=body)
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)
