import redis.asyncio as redis
from pymongo import AsyncMongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
import os


load_dotenv()
REDIS_URL = os.environ.get("REDIS_URL")
MONGO_URL = os.getenv("MONGO_URL")


async def init_redis(app):
    app.state.redis = redis.from_url(REDIS_URL, decode_responses=True)


async def close_redis(app):
    await app.state.redis.close()


async def init_mongo(app):
    app.state.mongo = AsyncMongoClient(MONGO_URL, server_api=ServerApi('1'))


async def close_mongo(app):
    await app.state.mongo.close()
