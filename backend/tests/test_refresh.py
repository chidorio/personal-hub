import pytest

pytestmark = pytest.mark.anyio


async def post_refresh(client, token: str):
    return await client.post("/auth/refresh", headers={"Cookie": f"refresh_token={token}"})


async def post_logout(client, token: str):
    return await client.post("/auth/logout", headers={"Cookie": f"refresh_token={token}"})


async def test_refresh_correct_data(client, tokens):
    response = await post_refresh(client, tokens["refresh_token"])
    assert response.status_code == 200

    assert response.cookies["refresh_token"] != tokens["refresh_token"]


async def test_refresh_reuse(client, tokens):
    response1 = await post_refresh(client, tokens["refresh_token"])
    assert response1.status_code == 200

    response2 = await post_refresh(client, tokens["refresh_token"])
    assert response2.status_code == 401

    response3 = await post_refresh(client, response1.cookies["refresh_token"])
    assert response3.status_code == 401


async def test_logout_refresh(client, tokens):
    response1 = await post_logout(client, tokens["refresh_token"])
    assert response1.status_code == 204

    response2 = await post_refresh(client, tokens["refresh_token"])
    assert response2.status_code == 401


async def test_logout_incorrect_data(client):
    response1 = await post_logout(client, "dsfdsfds")
    assert response1.status_code == 204


async def test_without_cookie(client):
    response = await client.post("/auth/refresh")
    assert response.status_code == 401


async def test_logout_cookie(client, tokens):
    response = await client.post("/auth/logout")
    cookie = response.headers["set-cookie"]
    assert "Max-Age=0" in cookie
