from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Space, SpaceKind, SpaceMember, SpaceRole, User

PERSONAL_SPACE_NAME = "Личное"


async def create_space(session: AsyncSession, name: str, kind: SpaceKind, owner: User) -> Space:
    space = Space(name=name, kind=kind)
    session.add(space)
    await session.flush()

    space_member = SpaceMember(space_id=space.id, user_id=owner.id, role=SpaceRole.OWNER)
    session.add(space_member)
    await session.flush()

    return space


async def list_user_spaces(session: AsyncSession, user_id: int) -> list[Space]:
    user_spaces = await session.scalars(
        select(Space)
        .join(SpaceMember, SpaceMember.space_id == Space.id)
        .where(SpaceMember.user_id == user_id)
        .order_by(Space.id)
    )
    return list(user_spaces.all())
