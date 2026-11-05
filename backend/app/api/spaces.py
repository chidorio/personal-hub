from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.db import get_session
from app.models import Space, SpaceKind
from app.schemas.space import SpaceCreate, SpaceRead
from app.services import spaces as spaces_service

router = APIRouter(prefix="/spaces", tags=["spaces"])


@router.get("", response_model=list[SpaceRead])
async def my_spaces(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[Space]:
    return await spaces_service.list_user_spaces(session, user.id)


@router.post("", response_model=SpaceRead, status_code=status.HTTP_201_CREATED)
async def create_my_space(
    data: SpaceCreate, user: CurrentUser, session: Annotated[AsyncSession, Depends(get_session)]
) -> Space:
    space = await spaces_service.create_space(
        session,
        data.name,
        kind=SpaceKind.SHARED,
        owner=user,
    )

    await session.commit()

    return space
