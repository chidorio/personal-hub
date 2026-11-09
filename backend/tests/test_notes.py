import pytest
from sqlalchemy import delete, select

from app.models import Note, User
from app.services import spaces as spaces_service
from tests.helpers import create_note, create_shared_space, create_users, personal_space_id

pytestmark = pytest.mark.anyio


async def test_create_note_by_owner(client, session_maker, user, tokens):
    space_id = await personal_space_id(session_maker, user["email"])

    response = await client.post(
        f"/spaces/{space_id}/notes",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json={"title": "Test"},
    )

    assert response.status_code == 201
    body = response.json()

    async with session_maker() as session:
        note = await session.get(Note, body["id"])
        user = await session.scalar(select(User).where(User.email == user["email"]))

    assert space_id == note.space_id

    response2 = await client.get(
        f"/spaces/{space_id}/notes",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )

    assert response2.status_code == 200
    assert response.json()["author_id"] == user.id
    assert response2.json() == [body]


async def test_another_field_payload(client, session_maker):
    users = await create_users(session_maker, 2)
    user0 = users[0]
    user1 = users[1]

    space_id0 = await personal_space_id(session_maker, user0["user"].email)
    space_id1 = await personal_space_id(session_maker, user1["user"].email)

    response = await client.post(
        f"/spaces/{space_id0}/notes",
        headers={"Authorization": f"Bearer {user0['token']}"},
        json={"title": "Test", "author_id": user1["user"].id, "space_id": space_id1},
    )

    assert response.status_code == 201
    body = response.json()

    async with session_maker() as session:
        note = await session.get(Note, body["id"])

    assert note.space_id == space_id0
    assert note.author_id == user0["user"].id


async def test_create_note_by_member(client, session_maker):
    users = await create_users(session_maker, 2)
    user0 = users[0]
    user1 = users[1]
    shared_space = await create_shared_space(session_maker, user0)

    async with session_maker() as session:
        await spaces_service.add_member(session, shared_space.id, user1["user"].email)
        await session.commit()

    response = await client.post(
        f"/spaces/{shared_space.id}/notes",
        headers={"Authorization": f"Bearer {user1['token']}"},
        json={"title": "Test"},
    )

    assert response.status_code == 201

    response2 = await client.get(
        f"/spaces/{shared_space.id}/notes",
        headers={"Authorization": f"Bearer {user1['token']}"},
    )
    assert response2.status_code == 200
    assert response.json()["author_id"] == user1["user"].id
    assert response2.json() == [response.json()]


async def test_not_member(client, session_maker):
    users = await create_users(session_maker, 2)
    user0 = users[0]
    user1 = users[1]

    shared_space = await create_shared_space(session_maker, user0)

    response = await client.post(
        f"/spaces/{shared_space.id}/notes",
        headers={"Authorization": f"Bearer {user1['token']}"},
        json={"title": "Test"},
    )
    assert response.status_code == 404

    response2 = await client.get(
        f"/spaces/{shared_space.id}/notes",
        headers={"Authorization": f"Bearer {user1['token']}"},
    )
    assert response2.status_code == 404


async def test_without_token(client, session_maker, user):
    space_id = await personal_space_id(session_maker, user["email"])

    response = await client.post(
        f"/spaces/{space_id}/notes",
        json={"title": "Test"},
    )
    assert response.status_code == 401

    response2 = await client.get(
        f"/spaces/{space_id}/notes",
    )
    assert response2.status_code == 401


async def test_only_one_space(client, session_maker):
    users = await create_users(session_maker, 2)
    user0 = users[0]
    user1 = users[1]

    space_id0 = await personal_space_id(session_maker, user0["user"].email)
    space_id1 = await personal_space_id(session_maker, user1["user"].email)

    response0 = await client.post(
        f"/spaces/{space_id0}/notes",
        headers={"Authorization": f"Bearer {user0['token']}"},
        json={"title": "Test0"},
    )
    assert response0.status_code == 201

    response1 = await client.post(
        f"/spaces/{space_id1}/notes",
        headers={"Authorization": f"Bearer {user1['token']}"},
        json={"title": "Test1"},
    )
    assert response1.status_code == 201

    response2 = await client.get(
        f"/spaces/{space_id0}/notes",
        headers={"Authorization": f"Bearer {user0['token']}"},
    )
    assert response2.status_code == 200

    assert response2.json() == [response0.json()]


VALID_PAYLOAD = {"title": "test", "body": "body"}


@pytest.mark.parametrize(
    ("payload", "expected"),
    [
        (VALID_PAYLOAD, 201),
        ({**VALID_PAYLOAD, "title": "t" * 200}, 201),
        ({**VALID_PAYLOAD, "body": "b" * 50_000}, 201),
        ({**VALID_PAYLOAD, "title": ""}, 422),
        ({**VALID_PAYLOAD, "title": "test" * 100}, 422),
        ({**VALID_PAYLOAD, "body": "b" * 50_001}, 422),
        ({"body": "body"}, 422),
    ],
    ids=[
        "valid",
        "max_title",
        "max_body",
        "empty_title",
        "too_long_title",
        "too_long_body",
        "without_title",
    ],
)
async def test_incorrect_data(client, session_maker, user, tokens, payload, expected):
    space_id = await personal_space_id(session_maker, user["email"])

    response = await client.post(
        f"/spaces/{space_id}/notes",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json=payload,
    )

    assert response.status_code == expected


async def test_delete_author_keeps_note(session_maker):
    users = await create_users(session_maker, 1)
    author = users[0]["user"]
    space_id = await personal_space_id(session_maker, author.email)

    async with session_maker() as session:
        note = Note(space_id=space_id, author_id=author.id, title="Test")
        session.add(note)
        await session.commit()

    async with session_maker() as session:
        await session.execute(delete(User).where(User.id == author.id))
        await session.commit()

    async with session_maker() as session:
        saved_note = await session.get(Note, note.id)

    assert saved_note is not None
    assert saved_note.author_id is None


async def test_get_note(client, session_maker, user, tokens):
    space_id = await personal_space_id(session_maker, user["email"])

    async with session_maker() as session:
        user_id = await session.scalar(select(User.id).where(User.email == user["email"]))
    _note = await create_note(session_maker, space_id, user_id)

    response = await client.get(
        f"/spaces/{space_id}/notes/{_note.id}",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert response.status_code == 200
    assert response.json()["id"] == _note.id


async def test_get_note_from_other_space(client, session_maker):
    users = await create_users(session_maker, count=2)
    user0 = users[0]
    user1 = users[1]

    space0_id = await personal_space_id(session_maker, user0["user"].email)
    note0 = await create_note(session_maker, space0_id, user0["user"].id)

    space1_id = await personal_space_id(session_maker, user1["user"].email)

    response = await client.get(
        f"/spaces/{space1_id}/notes/{note0.id}",
        headers={"Authorization": f"Bearer {user1['token']}"},
    )
    assert response.status_code == 404


async def test_get_missing_note(client, session_maker):
    users = await create_users(session_maker, count=2)
    user0 = users[0]

    space0_id = await personal_space_id(session_maker, user0["user"].email)

    response = await client.get(
        f"/spaces/{space0_id}/notes/999999",
        headers={"Authorization": f"Bearer {user0['token']}"},
    )
    assert response.status_code == 404


async def test_update_changes_only_sent_fields(client, session_maker):
    users = await create_users(session_maker, count=1)
    user0 = users[0]

    space0_id = await personal_space_id(session_maker, user0["user"].email)
    note0 = await create_note(session_maker, space0_id, user0["user"].id, body="keep", pinned=True)

    new_title = "safiwsedhfyu8wegbf"
    response = await client.patch(
        f"/spaces/{space0_id}/notes/{note0.id}",
        headers={"Authorization": f"Bearer {user0['token']}"},
        json={"title": new_title},
    )

    async with session_maker() as session:
        note_after_changes = await session.get(Note, note0.id)

    assert response.status_code == 200
    assert response.json()["title"] == new_title
    assert note_after_changes.title == new_title
    assert note_after_changes.body == "keep"
    assert note_after_changes.pinned is True


async def test_update_changes_updated_at(client, session_maker):
    users = await create_users(session_maker, count=1)
    user0 = users[0]

    space0_id = await personal_space_id(session_maker, user0["user"].email)
    note0 = await create_note(session_maker, space0_id, user0["user"].id)

    new_title = "safiwsedhfyu8wegbf"
    response = await client.patch(
        f"/spaces/{space0_id}/notes/{note0.id}",
        headers={"Authorization": f"Bearer {user0['token']}"},
        json={"title": new_title},
    )

    assert response.status_code == 200

    body = response.json()
    assert body["updated_at"] > body["created_at"]


async def test_update_note_from_other_space(client, session_maker):
    users = await create_users(session_maker, count=2)
    user0 = users[0]
    user1 = users[1]

    space0_id = await personal_space_id(session_maker, user0["user"].email)
    note0 = await create_note(session_maker, space0_id, user0["user"].id)

    space1_id = await personal_space_id(session_maker, user1["user"].email)

    new_title = "safiwsedhfyu8wegbf"
    response = await client.patch(
        f"/spaces/{space1_id}/notes/{note0.id}",
        headers={"Authorization": f"Bearer {user1['token']}"},
        json={"title": new_title},
    )

    assert response.status_code == 404

    async with session_maker() as session:
        note_after_response = await session.get(Note, note0.id)

    assert note_after_response.title == "test"


DATA_PAYLOAD_UPDATE = {
    "title": "valid",
    "body": "valid",
    "pinned": True,
}


@pytest.mark.parametrize(
    "payload",
    [
        {**DATA_PAYLOAD_UPDATE, "title": None},
        {**DATA_PAYLOAD_UPDATE, "title": ""},
        {**DATA_PAYLOAD_UPDATE, "body": "q" * 50_001},
    ],
    ids=["title_none", "empty_title", "incorrect_body"],
)
async def test_update_rejects_bad_data(client, session_maker, payload):
    users = await create_users(session_maker, count=1)
    user0 = users[0]

    space0_id = await personal_space_id(session_maker, user0["user"].email)
    note0 = await create_note(session_maker, space0_id, user0["user"].id)

    response = await client.patch(
        f"/spaces/{space0_id}/notes/{note0.id}",
        headers={"Authorization": f"Bearer {user0['token']}"},
        json=payload,
    )

    assert response.status_code == 422


async def test_member_can_update_note_of_owner(client, session_maker):
    users = await create_users(session_maker, count=2)
    user0 = users[0]
    user1 = users[1]

    space0_shared = await create_shared_space(session_maker, user0)
    note0 = await create_note(session_maker, space0_shared.id, user0["user"].id)

    async with session_maker() as session:
        await spaces_service.add_member(session, space0_shared.id, user1["user"].email)
        await session.commit()

    response = await client.patch(
        f"/spaces/{space0_shared.id}/notes/{note0.id}",
        headers={"Authorization": f"Bearer {user1['token']}"},
        json={"title": "new_title"},
    )

    assert response.status_code == 200
    assert response.json()["author_id"] == user0["user"].id


async def test_delete_note(client, session_maker):
    users = await create_users(session_maker, count=1)
    user0 = users[0]

    space0_id = await personal_space_id(session_maker, user0["user"].email)
    note0 = await create_note(session_maker, space0_id, user0["user"].id)

    response = await client.delete(
        f"/spaces/{space0_id}/notes/{note0.id}",
        headers={"Authorization": f"Bearer {user0['token']}"},
    )

    assert response.status_code == 204

    async with session_maker() as session:
        note_after_response = await session.get(Note, note0.id)

    assert note_after_response is None


async def test_delete_note_from_other_space(client, session_maker):
    users = await create_users(session_maker, count=2)
    user0 = users[0]
    user1 = users[1]

    space0_id = await personal_space_id(session_maker, user0["user"].email)
    note0 = await create_note(session_maker, space0_id, user0["user"].id)

    space1_id = await personal_space_id(session_maker, user1["user"].email)

    response = await client.delete(
        f"/spaces/{space1_id}/notes/{note0.id}",
        headers={"Authorization": f"Bearer {user1['token']}"},
    )

    assert response.status_code == 404

    async with session_maker() as session:
        note_after_response = await session.get(Note, note0.id)

    assert note_after_response is not None


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
async def test_not_member_gets_404(client, session_maker, method):
    users = await create_users(session_maker, count=2)
    user0 = users[0]
    user1 = users[1]

    space0_id = await personal_space_id(session_maker, user0["user"].email)
    note0 = await create_note(session_maker, space0_id, user0["user"].id)

    response = await client.request(
        method,
        f"/spaces/{space0_id}/notes/{note0.id}",
        headers={"Authorization": f"Bearer {user1['token']}"},
        json={"title": "new_title"},
    )

    assert response.status_code == 404


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
async def test_without_token_gets_401(client, session_maker, method):
    users = await create_users(session_maker, count=2)
    user0 = users[0]

    space0_id = await personal_space_id(session_maker, user0["user"].email)
    note0 = await create_note(session_maker, space0_id, user0["user"].id)

    response = await client.request(
        method,
        f"/spaces/{space0_id}/notes/{note0.id}",
        json={"title": "new_title"},
    )

    assert response.status_code == 401
