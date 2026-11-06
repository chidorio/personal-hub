import pytest
from sqlalchemy import select

from app.core.security import create_access_token
from app.models import (
    SpaceKind,
    SpaceMember,
)
from app.services import spaces as spaces_service
from app.services import users as users_service

pytestmark = pytest.mark.anyio


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


async def test_owner_adds_member(client, session_maker):
    users = await create_users(session_maker, 2)
    owner = users[0]
    new_member = users[1]

    space = await create_shared_space(session_maker, owner)

    response = await client.post(
        f"/spaces/{space.id}/members",
        headers={"Authorization": f"Bearer {owner['token']}"},
        json={"email": new_member["user"].email},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user_id"] == new_member["user"].id
    assert body["role"] == "member"

    response2 = await client.get(
        "/spaces",
        headers={"Authorization": f"Bearer {new_member['token']}"},
    )

    assert response2.status_code == 200
    assert space.id in [space["id"] for space in response2.json()]


async def test_not_member(client, session_maker):
    users = await create_users(session_maker, 3)
    space = await create_shared_space(session_maker, users[0])

    response = await client.post(
        f"/spaces/{space.id}/members",
        headers={"Authorization": f"Bearer {users[1]['token']}"},
        json={"email": users[2]["user"].email},
    )

    assert response.status_code == 404


async def test_not_owner(client, session_maker):
    users = await create_users(session_maker, 3)
    owner = users[0]
    new_member = users[1]

    space = await create_shared_space(session_maker, owner)
    async with session_maker() as session:
        await spaces_service.add_member(session, space.id, new_member["user"].email)
        await session.commit()

    response = await client.post(
        f"/spaces/{space.id}/members",
        headers={"Authorization": f"Bearer {new_member['token']}"},
        json={"email": users[2]["user"].email},
    )

    assert response.status_code == 403


async def test_personal_space(client, session_maker):
    users = await create_users(session_maker, 2)
    user1 = users[0]

    async with session_maker() as session:
        space_id = await session.scalar(
            select(SpaceMember.space_id).where(SpaceMember.user_id == user1["user"].id)
        )

    response = await client.post(
        f"/spaces/{space_id}/members",
        headers={"Authorization": f"Bearer {user1['token']}"},
        json={"email": users[1]["user"].email},
    )

    assert response.status_code == 409


async def test_unknown_email(client, session_maker):
    users = await create_users(session_maker, 2)
    user0 = users[0]
    space = await create_shared_space(session_maker, user0)

    response = await client.post(
        f"/spaces/{space.id}/members",
        headers={"Authorization": f"Bearer {user0['token']}"},
        json={"email": "unknown@test.com"},
    )

    assert response.status_code == 404


async def test_repeat_add(client, session_maker):
    users = await create_users(session_maker, 2)
    owner = users[0]
    new_member = users[1]
    space = await create_shared_space(session_maker, owner)

    async with session_maker() as session:
        await spaces_service.add_member(session, space_id=space.id, email=new_member["user"].email)
        await session.commit()

    response = await client.post(
        f"/spaces/{space.id}/members",
        headers={"Authorization": f"Bearer {owner['token']}"},
        json={"email": new_member["user"].email},
    )

    assert response.status_code == 409


async def test_without_token(client, session_maker):
    users = await create_users(session_maker, 2)
    owner = users[0]
    new_member = users[1]
    space = await create_shared_space(session_maker, owner)

    response = await client.post(
        f"/spaces/{space.id}/members",
        json={"email": new_member["user"].email},
    )

    assert response.status_code == 401
