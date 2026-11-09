from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentSpaceMember
from app.core.db import get_session
from app.models import Note
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate
from app.services import notes as notes_service

router = APIRouter(prefix="/spaces/{space_id}/notes", tags=["notes"])


@router.get("", response_model=list[NoteRead])
async def notes_list(
    space_member: CurrentSpaceMember,
    session: Annotated[AsyncSession, Depends(get_session)],
    pinned: bool | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Note]:
    return await notes_service.list_notes(session, space_member.space_id, pinned, limit, offset)


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


async def get_space_note(
    note_id: int,
    member: CurrentSpaceMember,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Note:
    space_note = await notes_service.get_note(session, member.space_id, note_id)
    if space_note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return space_note


SpaceNote = Annotated[Note, Depends(get_space_note)]


@router.get("/{note_id}", response_model=NoteRead)
async def note_get(
    space_note: SpaceNote,
) -> Note:
    return space_note


@router.patch("/{note_id}", response_model=NoteRead)
async def note_update(
    data: NoteUpdate,
    space_note: SpaceNote,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Note:
    _note = await notes_service.update_note(
        session, space_note, data.model_dump(exclude_unset=True)
    )
    await session.commit()
    return _note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def note_delete(
    space_note: SpaceNote,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    await notes_service.delete_note(session, space_note)
    await session.commit()
