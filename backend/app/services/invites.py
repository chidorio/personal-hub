import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_token
from app.models import Invite


async def create_invite(session: AsyncSession, ttl: timedelta) -> tuple[Invite, str]:
    code = secrets.token_urlsafe(16)

    create_time = datetime.now(UTC)
    invite = Invite(
        code_hash=hash_token(code),
        expires_at=create_time + ttl,
    )

    session.add(invite)
    await session.flush()

    return invite, code
