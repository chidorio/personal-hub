from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.schemas.user import UserCreate, UserRead
from app.services import auth as auth_service
from app.services import invites as invites_service
from app.services import refresh_tokens as refresh_tokens_service
from app.services import users as users_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(
    data: UserCreate, session: Annotated[AsyncSession, Depends(get_session)]
) -> User:
    try:
        user = await auth_service.register_with_invite(
            session=session,
            email=data.email,
            name=data.name,
            password=data.password,
            invite_code=data.invite_code,
        )
    except invites_service.InvalidInviteError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired invite code"
        ) from None
    except users_service.UserAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists"
        ) from None

    await session.commit()

    return user


@router.post("/login")
async def login_user(
    data: LoginRequest, session: Annotated[AsyncSession, Depends(get_session)]
) -> TokenResponse:
    try:
        access_token, refresh_token = await auth_service.login(session, data.email, data.password)
    except auth_service.InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    await session.commit()

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh")
async def refresh(
    data: RefreshRequest, session: Annotated[AsyncSession, Depends(get_session)]
) -> TokenResponse:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
    )
    try:
        access_token, refresh_token = await auth_service.refresh(session, data.refresh_token)
    except refresh_tokens_service.RefreshTokenReuseError:
        await session.commit()
        raise unauthorized from None
    except refresh_tokens_service.InvalidRefreshTokenError:
        raise unauthorized from None

    await session.commit()
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    data: RefreshRequest, session: Annotated[AsyncSession, Depends(get_session)]
) -> None:
    await refresh_tokens_service.revoke_refresh_token(session, data.refresh_token)
    await session.commit()
