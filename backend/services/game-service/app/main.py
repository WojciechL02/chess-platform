from contextlib import asynccontextmanager
import asyncio
import json
import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Add parent directory to sys.path to allow importing from common
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from common.auth import authenticate_websocket

from .storage_utils import init_redis, close_redis, init_mongo, close_mongo
from .handlers import EVENT_HANDLERS, ensure_game_state_exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    await init_redis(app)
    await init_mongo(app)
    yield
    # shutdown
    await close_redis(app)
    await close_mongo(app)


app = FastAPI(title="Game Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/game/{game_id}")
async def handle_game(websocket: WebSocket, game_id: str):
    user = await authenticate_websocket(websocket)
    if not user:
        return
    
    user_id = user["id"]
    await websocket.accept()
    r = websocket.app.state.redis
    m = websocket.app.state.mongo

    await ensure_game_state_exists(r, game_id)
    state = await r.hgetall(f"game_state_{game_id}")
    if state:
        await websocket.send_text(json.dumps({
            "event": "sync",
            "fen": state.get("fen"),
            "turn": state.get("turn"),
            "white_time": float(state.get("white_time")),
            "black_time": float(state.get("black_time")),
            "white_id": state.get("white_id"),
            "black_id": state.get("black_id"),
        }))

    pubsub = r.pubsub()
    await pubsub.subscribe(f"game:{game_id}")

    async def ws_receiver():
        try:
            while True:
                msg = await websocket.receive_text()
                data = json.loads(msg)
                event = data.get("event")

                if event in EVENT_HANDLERS:
                    await EVENT_HANDLERS[event](r, m, game_id, user_id, data)
                else:
                    await websocket.send_text(json.dumps({"error": "Unknown event"}))
        except WebSocketDisconnect:
            pass

    async def pubsub_receiver():
        try:
            while True:
                async for msg in pubsub.listen():
                    if msg["type"] == "message":
                        payload = json.loads(msg["data"])
                        await websocket.send_text(json.dumps(payload))
        finally:
            await pubsub.unsubscribe(f"game:{game_id}")
            await pubsub.close()

    await asyncio.gather(ws_receiver(), pubsub_receiver())
