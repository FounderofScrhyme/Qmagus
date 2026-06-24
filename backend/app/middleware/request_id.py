import logging
import uuid

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.context import request_id_ctx

logger = logging.getLogger(__name__)


class RequestIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {
            key.decode("latin-1").lower(): value.decode("latin-1")
            for key, value in scope.get("headers", [])
        }
        request_id = headers.get("x-request-id") or str(uuid.uuid4())
        token = request_id_ctx.set(request_id)
        endpoint = f"{scope.get('method', 'GET')} {scope.get('path', '/')}"
        status_code: int | None = None

        logger.info("Request started", extra={"endpoint": endpoint})

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status")
                response_headers = list(message.get("headers", []))
                response_headers.append((b"x-request-id", request_id.encode("latin-1")))
                message["headers"] = response_headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            logger.exception(
                "Request failed",
                extra={"endpoint": endpoint, "error": "unhandled exception"},
            )
            request_id_ctx.reset(token)
            raise

        logger.info(
            "Request completed",
            extra={"endpoint": endpoint, "status_code": status_code},
        )
        request_id_ctx.reset(token)
