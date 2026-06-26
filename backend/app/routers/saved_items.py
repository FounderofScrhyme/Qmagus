import logging
import uuid

import asyncpg
from fastapi import APIRouter, Depends, Query, Response, status

from app.auth.deps import get_current_user_id
from app.config import settings
from app.database import get_pool_dep
from app.exceptions import AppError
from app.repositories import saved_items as saved_items_repo
from app.repositories import sessions as sessions_repo
from app.schemas.saved_items import SavedItemCreate, SavedItemRead, SavedItemsBatchCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/saved-items", tags=["saved-items"])


def _to_saved_item_read(row: saved_items_repo.SavedItemRecord) -> SavedItemRead:
    return SavedItemRead(
        id=row.id,
        session_id=row.session_id,
        type=row.type,
        original=row.original,
        corrected=row.corrected,
        explanation=row.explanation,
        created_at=row.created_at,
    )


async def _ensure_owned_session(
    *,
    pool: asyncpg.Pool,
    session_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    session = await sessions_repo.get_session(pool, session_id)
    if session is None:
        raise AppError("SESSION_NOT_FOUND", "Session not found", 404)
    if session.user_id != user_id:
        raise AppError("FORBIDDEN", "You do not have access to this session", 403)


@router.post("", response_model=SavedItemRead, status_code=201)
async def create_saved_item(
    body: SavedItemCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    pool: asyncpg.Pool = Depends(get_pool_dep),
) -> SavedItemRead:
    await _ensure_owned_session(pool=pool, session_id=body.session_id, user_id=user_id)
    row = await saved_items_repo.create_saved_item(
        pool,
        user_id=user_id,
        session_id=body.session_id,
        type_=body.type,
        original=body.original,
        corrected=body.corrected,
        explanation=body.explanation,
    )
    logger.info("Saved item created", extra={"user_id": str(user_id)})
    return _to_saved_item_read(row)


@router.get("", response_model=list[SavedItemRead])
async def list_saved_items(
    user_id: uuid.UUID = Depends(get_current_user_id),
    limit: int = Query(
        default=settings.saved_item_list_default_limit,
        ge=1,
        le=settings.saved_item_list_max_limit,
    ),
    offset: int = Query(default=0, ge=0),
    pool: asyncpg.Pool = Depends(get_pool_dep),
) -> list[SavedItemRead]:
    rows = await saved_items_repo.list_saved_items(
        pool,
        user_id=user_id,
        limit=limit,
        offset=offset,
    )
    return [_to_saved_item_read(row) for row in rows]


@router.post("/batch", response_model=list[SavedItemRead], status_code=201)
async def create_saved_items_batch(
    body: SavedItemsBatchCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    pool: asyncpg.Pool = Depends(get_pool_dep),
) -> list[SavedItemRead]:
    created: list[SavedItemRead] = []
    checked_sessions: set[uuid.UUID] = set()
    for item in body.items:
        if item.session_id not in checked_sessions:
            await _ensure_owned_session(pool=pool, session_id=item.session_id, user_id=user_id)
            checked_sessions.add(item.session_id)
        row = await saved_items_repo.create_saved_item(
            pool,
            user_id=user_id,
            session_id=item.session_id,
            type_=item.type,
            original=item.original,
            corrected=item.corrected,
            explanation=item.explanation,
        )
        created.append(_to_saved_item_read(row))
    logger.info("Saved item batch created", extra={"user_id": str(user_id)})
    return created


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_item(
    item_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    pool: asyncpg.Pool = Depends(get_pool_dep),
) -> Response:
    deleted = await saved_items_repo.delete_saved_item(
        pool,
        item_id=item_id,
        user_id=user_id,
    )
    if not deleted:
        raise AppError("SAVED_ITEM_NOT_FOUND", "Saved item not found", 404)

    logger.info("Saved item deleted", extra={"user_id": str(user_id)})
    return Response(status_code=status.HTTP_204_NO_CONTENT)
