import asyncio
import sys
import os
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocket, WebSocketDisconnect
from datetime import datetime, UTC
import json
from dotenv import load_dotenv

# Add parent directory to sys.path to allow importing from common
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from common.auth import authenticate_websocket

from .redis_utils import init_redis, close_redis
from .worker import matchmaking_worker

load_dotenv()
USERS_SERVICE_URL = os.getenv("USERS_SERVICE_URL", "http://users-service:8000")

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connections = {}


@app.websocket("/ws/join")
async def join_queue(websocket: WebSocket):
    user = await authenticate_websocket(websocket)
    if not user:
        return
    
    await websocket.accept()
    r = websocket.app.state.redis
    user_id = user["id"]
    game_format = None

    try:
        # Fetch user details from users-service
        token = websocket.query_params.get("token")
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{USERS_SERVICE_URL}/users/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            if resp.status_code != 200:
                await websocket.close(code=1008)
                return
            user_details = resp.json()

        msg = await websocket.receive_text()
        user_data = json.loads(msg)
        game_format = user_data.get("game_format", "blitz")
        
        elo = user_details["elo_rating"]
        nickname = user_details["nickname"]
        joined_at = datetime.now(UTC).timestamp()

        connections[user_id] = websocket

        await r.zadd(f"mm_{game_format}_queue", {user_id: elo})
        await r.hset(f"user:{user_id}", mapping={
            "elo": elo,
            "nickname": nickname,
            "joined_at": joined_at,
        })

        # Keep connection alive (heartbeat)
        while True:
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        if user_id and game_format:
            await r.zrem(f"mm_{game_format}_queue", user_id)
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
