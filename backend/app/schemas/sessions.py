import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.config import settings


class SessionStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"


class SessionCreate(BaseModel):
    scenario_text: str = Field(min_length=1, max_length=settings.scenario_text_max_length)


class MessageRead(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime


class SessionRead(BaseModel):
    id: uuid.UUID
    scenario_text: str
    status: SessionStatus
    created_at: datetime
    completed_at: datetime | None = None


class SessionDetailRead(SessionRead):
    messages: list[MessageRead] = Field(default_factory=list)
