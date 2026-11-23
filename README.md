# Personal Hub

[![CI](https://github.com/chidorio/personal-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/chidorio/personal-hub/actions/workflows/ci.yml)

A self-hosted personal hub for two people: private and shared notes behind one access model.
The React interface and FastAPI backend run together with PostgreSQL via Docker Compose.

Sign in to create, edit, pin and delete notes in a personal or shared space. The interface is in Russian.

![Personal Hub sign-in screen with email and password fields and a registration link](docs/login.png)

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
| Web interface | React, TypeScript, Vite, Mantine, TanStack Query |
| Database | PostgreSQL 17, SQLAlchemy (async, asyncpg), Alembic |
| Security | PyJWT (HS256), Argon2id password hashing (pwdlib) |
| CLI | Typer |
| Tests | pytest, httpx `AsyncClient`, separate test database |
| Tooling | uv, ruff, pre-commit |
| Delivery | Docker Compose, Nginx, GitHub Actions, GitHub Container Registry |

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

Open the app at <http://localhost:8081>. Compose starts PostgreSQL, applies migrations and starts
FastAPI. Nginx serves the interface and forwards requests under `/api/` to FastAPI.
To check the connection, open <http://localhost:8081/api/health>. It should return `{"status":"ok"}`.

Create an invite code:

```bash
docker compose exec api python -m app.cli create-invite --days 1
```

Open <http://localhost:8081/register> and enter the code along with your name, email and password.
After registration, open your personal space and create your first note. Returning users can sign in at
<http://localhost:8081/login>. Interactive API documentation is available at <http://localhost:8000/docs>.

Stop everything with `docker compose down` (add `-v` only if you also want to delete the database).

## API overview

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register with an invite code |
| `POST` | `/auth/login` | Return an access token and set an HttpOnly refresh cookie |
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
- **Tests against a real database.** The backend tests run on a separate PostgreSQL database with migrations applied
  and cover isolation between users and spaces.
- **Container.** Multi-stage build with uv, runs as a non-root user; migrations run as a separate Compose
  service so the API never starts on an outdated schema.
- **CI/CD.** Pull requests and pushes to `main` run Ruff and pytest for the backend and Oxlint,
  TypeScript checks and a Vite build for the frontend. On `main`, the API image is published to GHCR
  with the tags `latest` and the commit SHA.

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
├── frontend/
│   ├── src/            # React pages, components and API client
│   ├── nginx.conf      # client-side routes and API proxy
│   └── Dockerfile      # build with Node.js, serve with Nginx
├── .github/workflows/ci.yml
└── docker-compose.yml
```

## Roadmap

- [x] Users, invite-only registration, JWT with refresh rotation
- [x] Personal and shared spaces, notes with pagination
- [x] CI, Docker image, Compose
- [x] React frontend for personal and shared notes, served by Nginx
- [ ] Full-text search (`tsvector` + GIN)
- [ ] Redis: cache, login rate limiting
- [ ] Celery + Telegram bot: notes from Telegram, notifications
- [ ] File attachments in S3 (MinIO), presigned URLs
- [ ] Price-drop alerts with price history (window functions)
- [ ] Deployment to a VPS behind Nginx with HTTPS
