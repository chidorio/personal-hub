import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_token
from app.models import RefreshToken, User


class InvalidRefreshTokenError(Exception):
    """Invalid refresh token"""


class RefreshTokenReuseError(InvalidRefreshTokenError):
    """refresh token reuse"""


async def issue_refresh_token(session: AsyncSession, user: User) -> str:
    token = secrets.token_urlsafe(32)

    refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_ttl_days),
    )

    session.add(refresh_token)
    await session.flush()

    return token


async def revoke_all_for_user(session: AsyncSession, user_id: int) -> None:
    await session.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )


async def use_refresh_token(session: AsyncSession, token: str) -> int:
    refresh_token = await session.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(token)).with_for_update()
    )

    if refresh_token is None:
        raise InvalidRefreshTokenError

    if refresh_token.revoked_at is not None:
        await revoke_all_for_user(session, refresh_token.user_id)
        raise RefreshTokenReuseError

    now = datetime.now(UTC)
    if refresh_token.expires_at <= now:
        raise InvalidRefreshTokenError

    refresh_token.revoked_at = now

    return refresh_token.user_id


async def revoke_refresh_token(session: AsyncSession, token: str) -> None:
    refresh_token = await session.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(token)).with_for_update()
    )

    if refresh_token is not None and refresh_token.revoked_at is None:
        refresh_token.revoked_at = datetime.now(UTC)
