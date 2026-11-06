from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, SpaceOwner
from app.core.db import get_session
from app.models import Space, SpaceKind, SpaceMember
from app.schemas.space import SpaceCreate, SpaceMemberAdd, SpaceMemberRead, SpaceRead
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


@router.post(
    "/{space_id}/members", response_model=SpaceMemberRead, status_code=status.HTTP_201_CREATED
)
async def add_member(
    data: SpaceMemberAdd,
    space_owner: SpaceOwner,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SpaceMember:
    try:
        space_member = await spaces_service.add_member(session, space_owner.space_id, data.email)
    except spaces_service.PersonalSpaceError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Personal space") from None
    except spaces_service.MemberUserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        ) from None
    except spaces_service.AlreadyMemberError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already member") from None

    await session.commit()

    return space_member
