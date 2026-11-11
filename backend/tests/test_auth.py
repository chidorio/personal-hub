import pytest
from sqlalchemy import select

from app.models import Invite

pytestmark = pytest.mark.anyio


async def test_register_with_invite(client, invite_code, session_maker):
    response = await client.post(
        "/auth/register",
        json={
            "email": "Anna@Example.com",
            "name": "Anna",
            "password": "correct-horse-1",
            "invite_code": invite_code,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "anna@example.com"
    assert "password_hash" not in body

    async with session_maker() as session:
        invite = await session.scalar(select(Invite))
        assert invite.used_at is not None
        assert invite.used_by_id == body["id"]


async def test_register_with_used_invite(client, invite_code):
    response_1 = await client.post(
        "/auth/register",
        json={
            "email": "test1@test.com",
            "name": "test",
            "password": "correct-horse-1",
            "invite_code": invite_code,
        },
    )

    response_2 = await client.post(
        "/auth/register",
        json={
            "email": "test2@test.com",
            "name": "test",
            "password": "correct-horse-1",
            "invite_code": invite_code,
        },
    )

    assert response_1.status_code == 201
    assert response_2.status_code == 400
