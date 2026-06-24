import json
import logging
from datetime import UTC, datetime

from app.context import request_id_ctx


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "message": record.getMessage(),
        }

        if request_id := request_id_ctx.get():
            payload["request_id"] = request_id

        for key in ("user_id", "endpoint", "error", "status_code"):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value

        return json.dumps(payload, ensure_ascii=False)


def setup_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    for logger_name in ("uvicorn", "uvicorn.error"):
        logger = logging.getLogger(logger_name)
        logger.handlers.clear()
        logger.propagate = True

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
