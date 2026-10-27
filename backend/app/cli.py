import asyncio
from datetime import timedelta
from typing import Annotated

import typer

from app.core.db import engine, session_factory
from app.models import Invite, User
from app.services import invites as invites_service
from app.services import users as users_service

app = typer.Typer()


@app.callback()
def main() -> None:
    """Personal-hub admin commands"""


@app.command("create-user")
def create_user_command(
    email: Annotated[str, typer.Option()],
    name: Annotated[str, typer.Option()],
    password: Annotated[str, typer.Option(prompt=True, hide_input=True, confirmation_prompt=True)],
) -> None:
    try:
        user = asyncio.run(_create_user(email, name, password))
    except users_service.UserAlreadyExistsError:
        typer.echo(f"User with email {email} already exists")
        raise typer.Exit(code=1) from None

    typer.echo(f"User created: id={user.id}, email={user.email}")


async def _create_user(email: str, name: str, password: str) -> User:
    try:
        async with session_factory() as session:
            user = await users_service.create_user(session, email, name, password)
            await session.commit()
    finally:
        await engine.dispose()

    return user


@app.command("create-invite")
def create_invite_command(
    days: Annotated[int, typer.Option(min=1, max=31, help="Срок действия, дни")] = 7,
) -> None:
    invite, code = asyncio.run(_create_invite(days))
    typer.echo(f"Invite code: {code}")
    typer.echo(f"Expires at: {invite.expires_at:%Y-%m-%d %H:%M} UTC")
    typer.echo("Save it now: the code is not stored and cannot be shown again")


async def _create_invite(days: int) -> tuple[Invite, str]:
    try:
        async with session_factory() as session:
            invite, code = await invites_service.create_invite(session, timedelta(days=days))
            await session.commit()
    finally:
        await engine.dispose()

    return invite, code


if __name__ == "__main__":
    app()
