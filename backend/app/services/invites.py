import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_token
from app.models import Invite, User


class InvalidInviteError(Exception):
    """Invite code is missing, already used or expired."""


async def create_invite(session: AsyncSession, ttl: timedelta) -> tuple[Invite, str]:
    code = secrets.token_urlsafe(16)

    invite = Invite(
        code_hash=hash_token(code),
        expires_at=datetime.now(UTC) + ttl,
    )

    session.add(invite)
    await session.flush()

    return invite, code


async def claim_invite(session: AsyncSession, code: str) -> Invite:
    invite = await session.scalar(
        select(Invite).where(Invite.code_hash == hash_token(code)).with_for_update()
    )

    if invite is None or invite.used_at is not None or invite.expires_at <= datetime.now(UTC):
        raise InvalidInviteError

    return invite


def mark_used(invite: Invite, user: User) -> None:
    invite.used_at = datetime.now(UTC)
    invite.used_by_id = user.id
