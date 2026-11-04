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
