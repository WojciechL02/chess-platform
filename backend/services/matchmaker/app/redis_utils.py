import redis.asyncio as redis
from dotenv import load_dotenv
import os


load_dotenv()
REDIS_URL = os.environ.get("REDIS_URL")


async def init_redis(app):
    app.state.redis = redis.from_url(REDIS_URL, decode_responses=True)


async def close_redis(app):
    await app.state.redis.close()
