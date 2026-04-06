from contextlib import asynccontextmanager
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from .redis_utils import init_redis, close_redis
from .handlers import EVENT_HANDLERS, ensure_game_state_exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    await init_redis(app)
    yield
    # shutdown
    await close_redis(app)


app = FastAPI(title="Game Service", lifespan=lifespan)


@app.websocket("/ws/game/{game_id}/{user_id}")
async def handle_game(websocket: WebSocket, game_id: str, user_id: str):
    await websocket.accept()
    r = websocket.app.state.redis

    await ensure_game_state_exists(r, game_id)

    pubsub = r.pubsub()
    await pubsub.subscribe(f"game:{game_id}")
    print(f"{user_id} SUBSCRIBED\n")

    async def ws_receiver():
        try:
            while True:
                msg = await websocket.receive_text()
                data = json.loads(msg)
                event = data.get("event")

                if event in EVENT_HANDLERS:
                    response = await EVENT_HANDLERS[event](r, game_id, user_id, data)
                    # await websocket.send_text(json.dumps(response))
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
                        if payload["user_id"] != user_id:
                            await websocket.send_text(json.dumps(payload))
        finally:
            await pubsub.unsubscribe(f"game:{game_id}")
            await pubsub.close()

    # Run both tasks concurrently
    await asyncio.gather(ws_receiver(), pubsub_receiver())
