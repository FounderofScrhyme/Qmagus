from pydantic import BaseModel, Field

from app.services.scenario_service import TtsVoiceGender


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4096)
    voice: TtsVoiceGender | None = None
