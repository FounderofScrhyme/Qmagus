from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTableUUID

from app.models.base import Base


class User(SQLAlchemyBaseUserTableUUID, Base):
    pass
