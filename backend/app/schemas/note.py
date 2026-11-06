from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class NoteCreate(BaseModel):
    title: Annotated[str, Field(min_length=1, max_length=200)]
    body: Annotated[str, Field(max_length=50_000)] = ""
    pinned: bool = False


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    space_id: int
    author_id: int | None
    title: str
    body: str
    pinned: bool
    created_at: datetime
    updated_at: datetime
