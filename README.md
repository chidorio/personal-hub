# Personal Hub

[![CI](https://github.com/chidorio/personal-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/chidorio/personal-hub/actions/workflows/ci.yml)

A self-hosted personal hub for two people: private and shared notes behind one access model.
The backend is a FastAPI service on PostgreSQL, tested against a real database and shipped as a Docker image.

> **Status:** the backend core (auth, spaces, notes) is done. Frontend, full-text search, file attachments,
> Telegram bot and price-drop alerts are next — see [Roadmap](#roadmap).

## Features

- **Invite-only registration.** Invite codes are created from the CLI; only a hash of the code is stored.
- **JWT authentication.** Short-lived access tokens (15 min) and refresh tokens (30 days) with rotation
  on every refresh. Reusing a revoked refresh token revokes all of the user's sessions.
- **Spaces.** Every user gets a personal space on registration and can create shared spaces and add members.
  Every object belongs to a space, so access is checked in one place: "is the user a member of this space?"
- **Notes.** Create, read, partially update (`PATCH`) and delete notes; list them with a pinned filter,
  pagination and stable ordering (pinned first, then most recently updated).

## Tech stack

| Area | Tools |
|---|---|
| API | Python 3.13, FastAPI, Pydantic v2 |
| Database | PostgreSQL 17, SQLAlchemy 2.0 (async, asyncpg), Alembic |
| Security | PyJWT (HS256), Argon2id password hashing (pwdlib) |
| CLI | Typer |
| Tests | pytest, httpx `AsyncClient`, separate test database |
| Tooling | uv, ruff, pre-commit |
| Delivery | Docker (multi-stage, non-root), Docker Compose, GitHub Actions, GitHub Container Registry |

## Quick start

Requirements: Docker with Docker Compose.

```bash
git clone https://github.com/chidorio/personal-hub.git
cd personal-hub
cp .env.example .env
```

Edit `.env`: set `POSTGRES_PASSWORD` and `JWT_SECRET` (the file shows how to generate one). Then:

```bash
docker compose up -d --build
```

This starts PostgreSQL, waits until it is healthy, applies migrations in a one-off `migrate` container
and then starts the API on <http://localhost:8000>.

Create an invite code:

```bash
docker compose exec api python -m app.cli create-invite --days 1
```

Open the interactive docs at <http://localhost:8000/docs> and:

1. `POST /auth/register` with your email, name, password and the invite code.
2. `POST /auth/login` and copy the `access_token`.
3. Click **Authorize**, paste the token, and try the `/spaces` and `/notes` endpoints.

Stop everything with `docker compose down` (add `-v` only if you also want to delete the database).

## API overview

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register with an invite code |
| `POST` | `/auth/login` | Get access and refresh tokens |
| `POST` | `/auth/refresh` | Rotate the refresh token |
| `POST` | `/auth/logout` | Revoke the refresh token |
| `GET` | `/users/me` | Current user |
| `GET` / `POST` | `/spaces` | List my spaces / create a shared space |
| `POST` | `/spaces/{space_id}/members` | Add a member (space owner only) |
| `GET` / `POST` | `/spaces/{space_id}/notes` | List notes (`?pinned=`, `limit`, `offset`) / create a note |
| `GET` / `PATCH` / `DELETE` | `/spaces/{space_id}/notes/{note_id}` | Read / partially update / delete a note |

## Engineering notes

- **Object-level authorization.** Notes are always looked up by both `id` and `space_id`, and a space the user
  does not belong to returns `404`, not `403`, so the API does not reveal that the object exists.
- **Refresh tokens in PostgreSQL.** Revoked tokens are kept, which is what makes reuse (token theft) detectable.
- **Index backed by `EXPLAIN`.** The notes list uses a composite index `(space_id, pinned, updated_at, id)`.
  On 200k generated rows it replaced "read the whole space and sort" with a backward index scan that reads
  only the requested page.
- **Tests against a real database.** 84 tests run on a separate PostgreSQL database with migrations applied,
  including isolation between users and spaces.
- **Container.** Multi-stage build with uv, runs as a non-root user; migrations run as a separate Compose
  service so the API never starts on an outdated schema.
- **CI/CD.** Every push runs ruff and pytest (with a PostgreSQL service). On `main`, the image is built
  and published to GHCR, tagged `latest` and with the commit SHA.

## Local development

Requirements: [uv](https://docs.astral.sh/uv/) and Docker.

```bash
docker compose up -d postgres
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Tests use a separate database `personal_hub_test`. Create it once:

```bash
docker compose exec postgres createdb -U hub personal_hub_test
```

Then run checks:

```bash
uv run ruff check . && uv run ruff format --check .
uv run pytest
```

Admin commands:

```bash
uv run python -m app.cli create-user --email you@example.com --name You
uv run python -m app.cli create-invite --days 7
```

## Project structure

```
personal-hub/
├── backend/
│   ├── app/
│   │   ├── api/        # FastAPI routers and dependencies
│   │   ├── core/       # settings, database, security
│   │   ├── models/     # SQLAlchemy models
│   │   ├── schemas/    # Pydantic schemas
│   │   ├── services/   # business logic shared by API and CLI
│   │   └── cli.py      # admin commands
│   ├── migrations/     # Alembic
│   ├── tests/
│   └── Dockerfile
├── .github/workflows/ci.yml
└── docker-compose.yml
```

## Roadmap

- [x] Users, invite-only registration, JWT with refresh rotation
- [x] Personal and shared spaces, notes with pagination
- [x] CI, Docker image, Compose
- [ ] React frontend
- [ ] Full-text search (`tsvector` + GIN)
- [ ] Redis: cache, login rate limiting
- [ ] Celery + Telegram bot: notes from Telegram, notifications
- [ ] File attachments in S3 (MinIO), presigned URLs
- [ ] Price-drop alerts with price history (window functions)
- [ ] Deployment to a VPS behind Nginx with HTTPS
