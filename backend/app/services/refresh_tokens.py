import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_token
from app.models import RefreshToken, User


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
