import logging

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.context import request_id_ctx
from app.exceptions import AppError

logger = logging.getLogger(__name__)

HTTP_STATUS_TO_CODE = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    500: "INTERNAL_ERROR",
}


def _error_response(
    status_code: int,
    code: str,
    message: str,
) -> JSONResponse:
    body: dict[str, object] = {
        "error": {
            "code": code,
            "message": message,
        },
    }
    if request_id := request_id_ctx.get():
        body["request_id"] = request_id

    return JSONResponse(status_code=status_code, content=body)


def register_exception_handlers(app) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        logger.error(
            exc.message,
            extra={"error": f"{exc.code}: {exc.message}"},
        )
        return _error_response(exc.status_code, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        message = "; ".join(
            f"{'.'.join(str(part) for part in error.get('loc', []))}: {error.get('msg')}"
            for error in exc.errors()
        )
        logger.warning(
            "Validation error",
            extra={"error": message},
        )
        return _error_response(400, "VALIDATION_ERROR", message)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        _request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        if isinstance(exc.detail, str):
            message = exc.detail
        elif isinstance(exc.detail, dict):
            reason = exc.detail.get("reason")
            message = str(reason) if reason is not None else str(exc.detail)
        else:
            message = str(exc.detail)

        code = HTTP_STATUS_TO_CODE.get(exc.status_code, "HTTP_ERROR")
        if exc.status_code >= 500:
            logger.error(message, extra={"error": message})
        elif exc.status_code >= 400:
            logger.warning(message, extra={"error": message})

        return _error_response(exc.status_code, code, message)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        _request: Request, _exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled exception", extra={"error": "internal server error"})
        return _error_response(
            500,
            "INTERNAL_ERROR",
            "An unexpected error occurred",
        )
