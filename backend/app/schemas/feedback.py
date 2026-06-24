from enum import StrEnum

from pydantic import BaseModel


class FeedbackType(StrEnum):
    GRAMMAR = "grammar"
    VOCABULARY = "vocabulary"
    NATURALNESS = "naturalness"
    PRONUNCIATION = "pronunciation"


class FeedbackItem(BaseModel):
    type: FeedbackType
    original: str
    corrected: str
    explanation: str


class FeedbackResponse(BaseModel):
    items: list[FeedbackItem]
