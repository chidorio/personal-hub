from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentSpaceMember
from app.core.db import get_session
from app.models import Note
from app.schemas.note import NoteCreate, NoteRead
from app.services import notes as notes_service

router = APIRouter(prefix="/spaces/{space_id}/notes", tags=["notes"])


@router.get("", response_model=list[NoteRead])
async def notes_list(
    space_member: CurrentSpaceMember,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[Note]:
    return await notes_service.list_notes(session, space_member.space_id)


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def notes_add(
    data: NoteCreate,
    space_member: CurrentSpaceMember,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Note:
    note = await notes_service.create_note(
        session, space_member.space_id, space_member.user_id, data.title, data.body, data.pinned
    )

    await session.commit()
    return note
