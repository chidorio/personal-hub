from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import SpaceKind, SpaceRole


class SpaceCreate(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=100)]


class SpaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    kind: SpaceKind
    created_at: datetime


class SpaceMemberAdd(BaseModel):
    email: EmailStr


class SpaceMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    role: SpaceRole
    joined_at: datetime
