import uuid

from fastapi import Depends

from app.auth.users import current_active_user
from app.models.user import User


async def get_current_user(
    user: User = Depends(current_active_user),
) -> User:
    return user


async def get_current_user_id(
    user: User = Depends(current_active_user),
) -> uuid.UUID:
    return user.id
