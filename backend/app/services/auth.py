from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_password
from app.models import User
from app.services import invites as invites_service
from app.services import refresh_tokens as refresh_tokens_service
from app.services import users as users_service


class InvalidCredentialsError(Exception):
    """invalid credentials error"""


async def register_with_invite(
    session: AsyncSession, email: str, name: str, password: str, invite_code: str
) -> User:
    invite = await invites_service.claim_invite(session=session, code=invite_code)
    user = await users_service.create_user(
        session=session, email=email, name=name, password=password
    )
    invites_service.mark_used(invite=invite, user=user)

    return user


async def authenticate(session: AsyncSession, email: str, password: str) -> User:
    email = email.strip().lower()

    user = await session.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError

    return user


async def login(session: AsyncSession, email: str, password: str) -> tuple[str, str]:
    user = await authenticate(session, email, password)
    access_token = create_access_token(user.id)
    ref_token = await refresh_tokens_service.issue_refresh_token(session, user)

    return access_token, ref_token
