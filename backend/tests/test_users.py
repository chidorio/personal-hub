from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import settings
from app.core.security import JWT_ALGORITHM

pytestmark = pytest.mark.anyio


async def test_users_me_correct_data(client, user, tokens):
    response = await client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == user["email"]


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer abc"},
        {"Authorization": "Basic abc"},
    ],
    ids=["no-header", "garbage", "basic-scheme"],
)
async def test_users_me_incorrect_data(client, headers):
    response = await client.get("/users/me", headers=headers)
    assert response.status_code == 401


NOW = datetime.now(UTC)
SECRET = settings.jwt_secret.get_secret_value()
VALID = {"sub": "1", "iat": NOW, "exp": NOW + timedelta(minutes=5)}


@pytest.mark.parametrize(
    ("payload", "secret", "expected"),
    [
        (VALID, SECRET, 200),
        ({**VALID, "exp": NOW - timedelta(minutes=1)}, SECRET, 401),
        (VALID, "other-secret", 401),
        ({"iat": NOW, "exp": VALID["exp"]}, SECRET, 401),
    ],
    ids=["valid", "expired", "foreign-secret", "no-sub"],
)
async def test_inactive_tokens(client, user, payload, secret, expected):
    token = jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)
    response = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == expected
