import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SpaceKind(enum.StrEnum):
    PERSONAL = "personal"
    SHARED = "shared"


class SpaceRole(enum.StrEnum):
    OWNER = "owner"
    MEMBER = "member"


class Space(Base):
    __tablename__ = "spaces"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    kind: Mapped[SpaceKind] = mapped_column(
        Enum(
            SpaceKind,
            native_enum=False,
            create_constraint=True,
            length=20,
            name="space_kind",
            values_callable=lambda e: [m.value for m in e],
        )
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SpaceMember(Base):
    __tablename__ = "space_members"

    space_id: Mapped[int] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role: Mapped[SpaceRole] = mapped_column(
        Enum(
            SpaceRole,
            native_enum=False,
            create_constraint=True,
            length=20,
            name="space_role",
            values_callable=lambda e: [m.value for m in e],
        )
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
