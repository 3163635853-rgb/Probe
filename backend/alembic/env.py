import asyncio
import sys
from pathlib import Path
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.base import Base
from models.user import User  # noqa: F401
from models.interview import InterviewSession, InterviewRound  # noqa: F401
from models.knowledge import KnowledgeQuestion  # noqa: F401
from models.config import Industry, Position, InterviewMode, DifficultyConfig  # noqa: F401
from models.feedback import Feedback  # noqa: F401
from models.payment import Payment, Subscription  # noqa: F401
from models.invite import InviteCode, InviteRecord  # noqa: F401
from models.notification import Notification  # noqa: F401
from models.coupon import Coupon, UserCoupon  # noqa: F401
from models.achievement import Achievement, UserAchievement  # noqa: F401
from models.share import ShareRecord  # noqa: F401
from models.growth import GrowthProfile, GrowthTask  # noqa: F401
from config import settings

config = context.config
# Override sqlalchemy.url from env
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online():
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
