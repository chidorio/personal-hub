from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.services import invites as invites_service
from app.services import users as users_service


async def register_with_invite(
    session: AsyncSession, email: str, name: str, password: str, invite_code: str
) -> User:
    invite = await invites_service.claim_invite(session=session, code=invite_code)
    user = await users_service.create_user(
        session=session, email=email, name=name, password=password
    )
    invites_service.mark_used(invite=invite, user=user)

    return user
