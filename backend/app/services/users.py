from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import User


class UserAlreadyExistsError(Exception):
    """User already exists"""


async def create_user(session: AsyncSession, email: str, name: str, password: str) -> User:
    email = email.strip().lower()

    existing = await session.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise UserAlreadyExistsError(email)

    user = User(email=email, name=name, password_hash=hash_password(password))
    session.add(user)
    await session.flush()

    return user
