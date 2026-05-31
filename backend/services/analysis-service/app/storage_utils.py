import os
from dotenv import load_dotenv
from pymongo import AsyncMongoClient
from pymongo.server_api import ServerApi


load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")


async def init_mongo(app):
    app.state.mongo = AsyncMongoClient(MONGO_URL, server_api=ServerApi("1"))


async def close_mongo(app):
    await app.state.mongo.close()
