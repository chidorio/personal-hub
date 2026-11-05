"""backfill personal spaces

Revision ID: 72a4e9b1c5b5
Revises: 24b6e686f5c9
Create Date: 2026-11-04 18:56:40.845448

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "72a4e9b1c5b5"
down_revision: str | Sequence[str] | None = "24b6e686f5c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        with
        targets as (
            select
                u.id user_id,
                nextval(pg_get_serial_sequence('spaces', 'id')) space_id
            from users u
            where not exists(
                select 1
                from space_members sm
                    join spaces s on s.id = sm.space_id
                        and s.kind = 'personal'
                where sm.user_id = u.id and sm.role = 'owner'
            )
        ),
        ins_space as (
            insert into spaces (id, name, kind)
            select space_id, 'Личное', 'personal'
            from targets
        )
        insert into space_members (space_id, user_id, role)
        select space_id, user_id, 'owner'
        from targets;
    """)


def downgrade() -> None:
    # Новые и старые личные пространства не отличить:
    # удаление снесло бы и данные новых пользователей
    pass
