import pytest
from sqlalchemy import select

from app.models import Space, SpaceKind, SpaceMember, SpaceRole, User
from tests.conftest import email, password

pytestmark = pytest.mark.anyio


async def get_user_spaces(session_maker, user_email: str):
    async with session_maker() as session:
        return (
            await session.execute(
                select(Space.kind, SpaceMember.role)
                .join(SpaceMember, SpaceMember.space_id == Space.id)
                .join(User, User.id == SpaceMember.user_id)
                .where(User.email == user_email)
            )
        ).all()


async def test_register_creates_personal_space(client, invite_code, session_maker):
    response = await client.post(
        "/auth/register",
        json={
            "email": email,
            "name": "Test",
            "password": password,
            "invite_code": invite_code,
        },
    )
    assert response.status_code == 201
    assert await get_user_spaces(session_maker, email) == [(SpaceKind.PERSONAL, SpaceRole.OWNER)]


async def test_create_user_creates_personal_space(user, session_maker):
    assert await get_user_spaces(session_maker, email) == [(SpaceKind.PERSONAL, SpaceRole.OWNER)]
