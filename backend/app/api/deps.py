from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.security import InvalidAccessTokenError, decode_access_token
from app.models import SpaceMember, SpaceRole, User

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        user_id = decode_access_token(credentials.credentials)
    except InvalidAccessTokenError:
        raise unauthorized from None

    user = await session.get(User, user_id)
    if user is None:
        raise unauthorized

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_space_member(
    space_id: int,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SpaceMember:
    space_member = await session.get(SpaceMember, (space_id, user.id))
    if space_member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")
    return space_member


CurrentSpaceMember = Annotated[SpaceMember, Depends(get_space_member)]


async def get_space_owner(space_member: CurrentSpaceMember) -> SpaceMember:
    if space_member.role != SpaceRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough rights")
    return space_member


SpaceOwner = Annotated[SpaceMember, Depends(get_space_owner)]
