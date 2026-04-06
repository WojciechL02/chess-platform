import redis.asyncio as redis
from fastapi import Request, HTTPException
import os
from dotenv import load_dotenv


load_dotenv()
REDIS_URL = os.getenv("REDIS_URL")
RATE_LIMIT = 50
WINDOW = 60


async def init_redis(app):
    app.state.redis = redis.from_url(REDIS_URL, decode_responses=True)


async def close_redis(app):
    await app.state.redis.close()


async def rate_limiter(request: Request):
    client_ip = request.client.host
    key = f"rate:{client_ip}"

    redis_client: redis.Redis = request.app.state.redis
    count = await redis_client.incr(key)

    if count == 1:
        await redis_client.expire(key, WINDOW)

    elif count > RATE_LIMIT:
        ttl = await redis_client.ttl(key)
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in  {ttl} seconds.",
        )
