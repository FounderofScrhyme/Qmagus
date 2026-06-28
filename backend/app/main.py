import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.backend import auth_backend
from app.auth.schemas import UserCreate, UserRead, UserUpdate
from app.auth.users import fastapi_users
from app.config import settings
from app.database import close_pool, init_pool
from app.handlers.errors import register_exception_handlers
from app.logging_config import setup_logging
from app.middleware.login_rate_limit import LoginRateLimitMiddleware
from app.middleware.request_id import RequestIdMiddleware
from app.routers.feedback import router as feedback_router
from app.routers.messages import router as messages_router
from app.routers.saved_items import router as saved_items_router
from app.routers.sessions import router as sessions_router
from app.routers.transcribe import router as transcribe_router
from app.routers.tts import router as tts_router

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        await init_pool()
    except Exception:
        logger.exception("Failed to initialize database pool on startup")
    yield
    await close_pool()


app = FastAPI(title="English Conversation API", lifespan=lifespan)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)
app.add_middleware(
    LoginRateLimitMiddleware,
    max_attempts=settings.login_rate_limit_max_attempts,
    window_seconds=settings.login_rate_limit_window_seconds,
)
app.add_middleware(RequestIdMiddleware)

app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)
app.include_router(sessions_router)
app.include_router(messages_router)
app.include_router(feedback_router)
app.include_router(saved_items_router)
app.include_router(transcribe_router)
app.include_router(tts_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
