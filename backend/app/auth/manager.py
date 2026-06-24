import uuid
from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.exceptions import InvalidPasswordException
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from pydantic import EmailStr

from app.auth.db import get_user_db
from app.config import settings
from app.models.user import User


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.jwt_secret
    verification_token_secret = settings.jwt_secret

    async def validate_password(
        self,
        password: str,
        user: User | None = None,
    ) -> None:
        if len(password) < settings.password_min_length:
            raise InvalidPasswordException(
                reason=(
                    f"Password must be at least {settings.password_min_length} characters"
                )
            )

        has_alpha = any(ch.isalpha() for ch in password)
        has_digit = any(ch.isdigit() for ch in password)
        if not (has_alpha and has_digit):
            raise InvalidPasswordException(
                reason="Password must include both letters and numbers"
            )

        user_email: EmailStr | None = user.email if user is not None else None
        if user_email and user_email.split("@")[0].lower() in password.lower():
            raise InvalidPasswordException(
                reason="Password must not contain your email local-part"
            )


async def get_user_manager(
    user_db: SQLAlchemyUserDatabase = Depends(get_user_db),
) -> AsyncGenerator[UserManager, None]:
    yield UserManager(user_db)
