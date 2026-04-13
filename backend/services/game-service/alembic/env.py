import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from alembic import context
import asyncio

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from common.models.game import Base as CommonBase
from app.db import Base as GameBase
from app.db import DATABASE_URL

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", DATABASE_URL)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = [GameBase.metadata, CommonBase.metadata]


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table="alembic_version_game",
    )

    with context.begin_transaction():
        context.run_migrations()


def include_object(object, name, type_, reflected, compare_to):
    # If it's a table, only let Alembic manage 'games' (and 'moves' if you want it to drop it)
    # Tell it explicitly to IGNORE the 'user' table and other alembic tables
    if type_ == "table":
        if name in ["user", "alembic_version_users"]:
            return False
    return True


async def run_migrations_online_async():
    """Run migrations online using async engine."""
    import uuid
    connectable = create_async_engine(
        DATABASE_URL,
        future=True,
        connect_args={
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4()}__",
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
    )

    async with connectable.begin() as connection:
        # Wrap context.configure inside run_sync
        await connection.run_sync(lambda sync_conn: context.configure(
            connection=sync_conn,
            target_metadata=target_metadata,
            version_table="alembic_version_game",
            include_object=include_object,
        ))
        # Run migrations inside run_sync too
        await connection.run_sync(lambda sync_conn: context.run_migrations())


def run_migrations_online():
    asyncio.run(run_migrations_online_async())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
