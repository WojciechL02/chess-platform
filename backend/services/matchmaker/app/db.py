import os
import uuid
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import pool


load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


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

async def get_async_session():
    async with async_session_maker() as session:
        yield session
