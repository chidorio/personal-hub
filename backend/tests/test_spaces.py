import pytest
from sqlalchemy import select

from app.models import Space, SpaceKind, SpaceMember, SpaceRole, User
from app.services import spaces as spaces_service
from app.services import users as users_service
from app.services.spaces import PERSONAL_SPACE_NAME
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


async def test_get_spaces_without_token(client):
    response = await client.get(
        "/spaces",
    )

    assert response.status_code == 401


async def test_new_user_have_one_personal_space(client, tokens):
    response = await client.get(
        "/spaces",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert response.status_code == 200
    assert [space["kind"] for space in response.json()] == ["personal"]


@pytest.mark.parametrize(
    ("payload"),
    [
        {"name": "test"},
        {"name": "test", "kind": "personal"},
    ],
    ids=["valid", "valid_add_param"],
)
async def test_new_space(client, tokens, payload):
    response = await client.post(
        "/spaces",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json=payload,
    )
    body = response.json()

    assert response.status_code == 201
    assert body["kind"] == "shared"

    response2 = await client.get(
        "/spaces", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )

    assert response2.status_code == 200
    assert body["id"] in [space["id"] for space in response2.json()]


@pytest.mark.parametrize(
    "payload",
    [{}, {"name": ""}, {"name": "x" * 101}],
    ids=["no-name", "empty-name", "too-long-name"],
)
async def test_new_space_incorrect_data(client, tokens, payload):
    response = await client.post(
        "/spaces",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json=payload,
    )

    assert response.status_code == 422


async def test_list_spaces_only_own(client, session_maker, tokens):
    async with session_maker() as session:
        other = await users_service.create_user(session, "other@test.com", "name", "pass")
        await spaces_service.create_space(session, "other_space", SpaceKind.SHARED, other)
        await session.commit()

    response = await client.get(
        "/spaces",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )

    assert response.status_code == 200
    assert [space["name"] for space in response.json()] == [PERSONAL_SPACE_NAME]
