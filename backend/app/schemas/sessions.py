import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class SessionStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"


class SessionCreate(BaseModel):
    scenario_text: str = Field(min_length=1)


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
