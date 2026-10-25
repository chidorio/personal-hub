import asyncio
from typing import Annotated

import typer

from app.core.db import engine, session_factory
from app.models import User
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


if __name__ == "__main__":
    app()
