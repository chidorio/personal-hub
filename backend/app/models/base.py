from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",  # индекс
    "uq": "uq_%(table_name)s_%(column_0_name)s",  # уникальность
    "ck": "ck_%(table_name)s_%(constraint_name)s",  # CHECK
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",  # внешний ключ
    "pk": "pk_%(table_name)s",  # первичный ключ
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
