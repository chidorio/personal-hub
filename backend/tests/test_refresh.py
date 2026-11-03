import pytest

pytestmark = pytest.mark.anyio


async def test_refresh_correct_data(client, tokens):
    response1 = await client.post(
        "/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert response1.status_code == 200
    body1 = response1.json()

    assert body1["refresh_token"] != tokens["refresh_token"]


async def test_refresh_reuse(client, tokens):
    response1 = await client.post(
        "/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert response1.status_code == 200
    body1 = response1.json()

    response2 = await client.post(
        "/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert response2.status_code == 401

    response3 = await client.post(
        "/auth/refresh",
        json={"refresh_token": body1["refresh_token"]},
    )

    assert response3.status_code == 401


async def test_logout_refresh(client, tokens):
    response1 = await client.post("/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert response1.status_code == 204

    response2 = await client.post(
        "/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert response2.status_code == 401


async def test_logout_incorrect_data(client):
    response1 = await client.post("/auth/logout", json={"refresh_token": "dsfdsfds"})
    assert response1.status_code == 204
