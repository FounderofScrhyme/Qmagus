from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import settings
from app.context import request_id_ctx
from app.database import get_pool
from app.rate_limit import check_rate_limit


class LoginRateLimitMiddleware:
    def __init__(self, app: ASGIApp, max_attempts: int, window_seconds: int) -> None:
        self.app = app
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.register_max_attempts = settings.register_rate_limit_max_attempts
        self.register_window_seconds = settings.register_rate_limit_window_seconds

    def _client_key(self, scope: Scope) -> str:
        headers = {
            key.decode("latin-1").lower(): value.decode("latin-1")
            for key, value in scope.get("headers", [])
        }
        xff = headers.get("x-forwarded-for", "")
        if settings.trust_x_forwarded_for and xff:
            return xff.split(",")[0].strip()

        client = scope.get("client")
        if client:
            return str(client[0])
        return "unknown"

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path")
        method = scope.get("method")
        if method == "POST" and path in {"/auth/jwt/login", "/auth/register"}:
            client_key = self._client_key(scope)
            scope_name = "login" if path == "/auth/jwt/login" else "register"
            window_seconds = (
                self.window_seconds
                if scope_name == "login"
                else self.register_window_seconds
            )
            limit = (
                self.max_attempts
                if scope_name == "login"
                else self.register_max_attempts
            )
            try:
                rate_limited = await check_rate_limit(
                    pool=get_pool(),
                    scope=f"auth:{scope_name}",
                    subject=client_key,
                    limit=limit,
                    window_seconds=window_seconds,
                )
            except RuntimeError:
                rate_limited = False

            if rate_limited:
                body: dict[str, object] = {
                    "error": {
                        "code": "TOO_MANY_REQUESTS",
                        "message": "Too many authentication attempts. Please try again later.",
                    }
                }
                if request_id := request_id_ctx.get():
                    body["request_id"] = request_id

                response = JSONResponse(status_code=429, content=body)
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)
