from sqlalchemy import select

from app.core.security import create_access_token
from app.models import Space, SpaceKind, SpaceMember, User
from app.services import spaces as spaces_service
from app.services import users as users_service


async def create_users(session_maker, count) -> list[dict]:
    users = []
    async with session_maker() as session:
        for i in range(count):
            user = await users_service.create_user(
                session, f"test{i}@test.com", f"test{i}", "password"
            )
            access_token = create_access_token(user.id)
            users.append(
                {
                    "user": user,
                    "token": access_token,
                }
            )

        await session.commit()

    return users


async def create_shared_space(session_maker, owner):
    async with session_maker() as session:
        space = await spaces_service.create_space(session, "Общее", SpaceKind.SHARED, owner["user"])
        await session.commit()

    return space


async def personal_space_id(session_maker, user_email):
    async with session_maker() as session:
        space_id = await session.scalar(
            select(SpaceMember.space_id)
            .select_from(User)
            .join(SpaceMember, SpaceMember.user_id == User.id)
            .join(Space, Space.id == SpaceMember.space_id)
            .where(User.email == user_email, Space.kind == SpaceKind.PERSONAL)
        )

    return space_id
