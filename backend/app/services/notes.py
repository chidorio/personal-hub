from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Note


async def create_note(
    session: AsyncSession, space_id: int, author_id: int, title: str, body: str, pinned: bool
) -> Note:
    note = Note(space_id=space_id, author_id=author_id, title=title, body=body, pinned=pinned)
    session.add(note)
    await session.flush()

    return note


async def list_notes(
    session: AsyncSession, space_id: int, pinned: bool | None, limit: int, offset: int
) -> list[Note]:
    query = select(Note).where(Note.space_id == space_id)

    if pinned is not None:
        query = query.where(Note.pinned == pinned)

    space_notes = await session.scalars(
        query.order_by(Note.pinned.desc(), Note.updated_at.desc(), Note.id.desc())
        .limit(limit)
        .offset(offset)
    )

    return list(space_notes.all())


async def get_note(session: AsyncSession, space_id: int, note_id: int) -> Note | None:
    return await session.scalar(select(Note).where(Note.space_id == space_id, Note.id == note_id))


async def update_note(session: AsyncSession, note: Note, changes: dict) -> Note:
    for field, value in changes.items():
        setattr(note, field, value)
    await session.flush()
    await session.refresh(note)
    return note


async def delete_note(session: AsyncSession, note: Note) -> None:
    await session.delete(note)
    await session.flush()
