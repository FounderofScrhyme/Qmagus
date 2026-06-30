import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.config import settings
from app.services.scenario_service import TtsVoiceGender


class SessionStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"


class SessionCreate(BaseModel):
    setting: str = Field(min_length=1, max_length=settings.scenario_field_max_length)
    user_role: str = Field(min_length=1, max_length=settings.scenario_field_max_length)
    ai_role: str = Field(min_length=1, max_length=settings.scenario_field_max_length)
    goal: str = Field(min_length=1, max_length=settings.scenario_field_max_length)
    tts_voice: TtsVoiceGender = TtsVoiceGender.MALE


class MessageRead(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime


class SessionRead(BaseModel):
    id: uuid.UUID
    scenario_text: str
    setting: str | None = None
    user_role: str | None = None
    ai_role: str | None = None
    goal: str | None = None
    tts_voice: TtsVoiceGender = TtsVoiceGender.MALE
    status: SessionStatus
    created_at: datetime
    completed_at: datetime | None = None


class SessionDetailRead(SessionRead):
    messages: list[MessageRead] = Field(default_factory=list)
