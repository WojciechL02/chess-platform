import os
from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase, SQLAlchemyBaseUserTableUUID
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import pool
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String
import uuid
from dotenv import load_dotenv


load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
Base: DeclarativeBase = declarative_base()


class User(SQLAlchemyBaseUserTableUUID, Base):
    __table_args__ = {"schema": "public"}

    elo_rating = Column(Integer, default=1200)
    nickname = Column(String(length=50), unique=True, nullable=False)


engine = create_async_engine(
    DATABASE_URL,
    poolclass=pool.NullPool,
    future=True,
    connect_args={
        "prepared_statement_name_func": lambda:  f"__asyncpg_{uuid.uuid4()}__",
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)
async_session_maker =  async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_async_session():
    async with async_session_maker() as session:
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)
