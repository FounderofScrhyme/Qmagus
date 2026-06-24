from collections.abc import AsyncGenerator
import asyncio

import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(settings.database_url_async, echo=False)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

_pool: asyncpg.Pool | None = None
_pool_lock = asyncio.Lock()


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


async def init_pool() -> None:
    global _pool
    async with _pool_lock:
        if _pool is None:
            _pool = await asyncpg.create_pool(dsn=settings.database_url_raw)


async def close_pool() -> None:
    global _pool
    async with _pool_lock:
        if _pool is not None:
            await _pool.close()
            _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized")
    return _pool


async def get_pool_dep() -> asyncpg.Pool:
    if _pool is None:
        await init_pool()
    return get_pool()
