from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models import User
from app.schemas.user import UserCreate, UserRead
from app.services import users as users_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(
    data: UserCreate, session: Annotated[AsyncSession, Depends(get_session)]
) -> User:
    try:
        user = await users_service.create_user(
            session=session, email=data.email, name=data.name, password=data.password
        )
    except users_service.UserAlreadyExistsError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="User with this email already exists"
        ) from None

    await session.commit()

    return user
