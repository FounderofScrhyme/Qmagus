import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.feedback import FeedbackType


class SavedItemCreate(BaseModel):
    session_id: uuid.UUID
    type: FeedbackType
    original: str = Field(min_length=1, max_length=4000)
    corrected: str = Field(min_length=1, max_length=4000)
    explanation: str = Field(min_length=1, max_length=4000)


class SavedItemsBatchCreate(BaseModel):
    items: list[SavedItemCreate] = Field(min_length=1, max_length=100)


class SavedItemRead(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    type: FeedbackType
    original: str
    corrected: str
    explanation: str
    created_at: datetime
