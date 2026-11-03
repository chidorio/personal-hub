import os
from datetime import timedelta
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import NullPool, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ["POSTGRES_DB"] = "personal_hub_test"

from app.core.config import settings  # noqa: E402
from app.core.db import get_session  # noqa: E402
from app.main import app  # noqa: E402
from app.services import invites as invites_service  # noqa: E402
from app.services import users as users_service  # noqa: E402


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture(scope="session", autouse=True)
def migrate():
    command.upgrade(Config(Path(__file__).resolve().parents[1] / "alembic.ini"), "head")


@pytest.fixture
async def session_maker():
    assert settings.postgres_db.endswith("_test")

    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    yield async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE users, invites, refresh_tokens RESTART IDENTITY CASCADE"))
    await engine.dispose()


@pytest.fixture
async def client(session_maker):
    async def override_get_session():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def invite_code(session_maker) -> str:
    async with session_maker() as session:
        _, code = await invites_service.create_invite(session, ttl=timedelta(days=1))
        await session.commit()

    return code


email = "test@test.com"
password = "correct-horse-1"


@pytest.fixture
async def user(session_maker) -> dict[str, str]:
    async with session_maker() as session:
        await users_service.create_user(session, email, "Test", password)
        await session.commit()

    return {"email": email, "password": password}


@pytest.fixture
async def tokens(client, user) -> dict[str, str]:
    response = await client.post(
        "/auth/login",
        json={"email": user["email"], "password": user["password"]},
    )
    assert response.status_code == 200

    return response.json()
