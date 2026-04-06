import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from starlette.websockets import WebSocket, WebSocketDisconnect
from datetime import datetime, UTC
import json

from .redis_utils import init_redis, close_redis
from .worker import matchmaking_worker, MATCHMAKING_QUEUE


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    await init_redis(app)
    asyncio.create_task(listen_for_matches(app))
    asyncio.create_task(matchmaking_worker(app))
    yield
    # shutdown
    await close_redis(app)


app = FastAPI(title="Matchmaking service", lifespan=lifespan)
connections = {}


@app.websocket("/ws/join")
async def join_queue(websocket: WebSocket):
    await websocket.accept()
    r = websocket.app.state.redis
    user_id = None

    try:
        msg = await websocket.receive_text()
        user_data = json.loads(msg)
        user_id = user_data["user_id"]
        elo = int(user_data["elo"])
        nickname = user_data["nickname"]
        joined_at = datetime.now(UTC).timestamp()

        connections[user_id] = websocket

        await r.zadd(MATCHMAKING_QUEUE, {user_id: elo})
        await r.hset(f"user:{user_id}", mapping={
            "elo": elo,
            "nickname": nickname,
            "joined_at": joined_at,
        })

        # Keep connection alive (heartbeat)
        while True:
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        if user_id:
            await r.zrem(MATCHMAKING_QUEUE, user_id)
            connections.pop(user_id, None)
            print(f"User {user_id} disconnected")


async def listen_for_matches(app):
    pubsub = app.state.redis.pubsub()
    await pubsub.subscribe("matches")

    async for msg in pubsub.listen():
        if msg["type"] != "message":
            continue

        event = json.loads(msg["data"])
        white_id, black_id = event["players"]["white"], event["players"]["black"]
        if white_id in connections:
            await send_match_info(white_id, event)
        if black_id in connections:
            await send_match_info(black_id, event)


async def send_match_info(player_id, event):
    ws = connections.get(player_id)
    try:
        await ws.send_text(json.dumps(event))
        await ws.close()
    except Exception:
        pass
    finally:
        connections.pop(player_id, None)
