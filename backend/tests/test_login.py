import pytest

from tests.conftest import email as user_email
from tests.conftest import password as user_password

pytestmark = pytest.mark.anyio


async def post_login(client, email, password):
    return await client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )


@pytest.mark.parametrize(
    ("email", "password"),
    [
        (user_email, user_password),
        (user_email.upper(), user_password),
    ],
    ids=["valid", "email-upper"],
)
async def test_login_correct_cred(client, user, email, password):
    response = await post_login(client, email, password)

    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.parametrize(
    ("email", "password"),
    [
        (user_email, "wrong"),
        ("wrong@test.com", user_password),
    ],
    ids=["wrong-password", "wrong-email"],
)
async def test_login_wrong_data(client, user, email, password):
    response = await post_login(client, email, password)
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"
