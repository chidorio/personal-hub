from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.models import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserRead
from app.services import auth as auth_service
from app.services import invites as invites_service
from app.services import refresh_tokens as refresh_tokens_service
from app.services import users as users_service

REFRESH_COOKIE = "refresh_token"

router = APIRouter(prefix="/auth", tags=["auth"])


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.refresh_token_ttl_days * 24 * 60 * 60,
        path="/",
    )


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
    data: LoginRequest, session: Annotated[AsyncSession, Depends(get_session)], response: Response
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

    set_refresh_cookie(response, refresh_token)

    return TokenResponse(access_token=access_token)


@router.post("/refresh")
async def refresh(
    session: Annotated[AsyncSession, Depends(get_session)],
    response: Response,
    refresh_token: Annotated[str | None, Cookie(max_length=64)] = None,
) -> TokenResponse:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
    )

    if refresh_token is None:
        raise unauthorized

    try:
        access_token, new_refresh_token = await auth_service.refresh(session, refresh_token)
    except refresh_tokens_service.RefreshTokenReuseError:
        await session.commit()
        raise unauthorized from None
    except refresh_tokens_service.InvalidRefreshTokenError:
        raise unauthorized from None

    await session.commit()
    set_refresh_cookie(response, new_refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    session: Annotated[AsyncSession, Depends(get_session)],
    response: Response,
    refresh_token: Annotated[str | None, Cookie(max_length=64)] = None,
) -> None:
    if refresh_token is not None:
        await refresh_tokens_service.revoke_refresh_token(session, refresh_token)

    response.delete_cookie(
        key=REFRESH_COOKIE, path="/", httponly=True, secure=True, samesite="strict"
    )

    await session.commit()
