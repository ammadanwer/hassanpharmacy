from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ReturnNoteBase(BaseModel):
    title: str
    description: Optional[str] = None


class ReturnNoteCreate(ReturnNoteBase):
    pass


class ReturnNoteUpdate(ReturnNoteBase):
    pass


class ReturnNoteResponse(ReturnNoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
