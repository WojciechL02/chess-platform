from contextlib import asynccontextmanager
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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


@app.websocket("/ws/game/{game_id}/{user_id}")
async def handle_game(websocket: WebSocket, game_id: str, user_id: str):
    await websocket.accept()
    r = websocket.app.state.redis
    m = websocket.app.state.mongo

    await ensure_game_state_exists(r, game_id)
    
    # Send current state for synchronization
    state = await r.hgetall(f"game_state_{game_id}")
    if state:
        await websocket.send_text(json.dumps({
            "event": "sync",
            "fen": state.get("fen"),
            "turn": state.get("turn"),
            "white_time": float(state.get("white_time", 180.0)),
            "black_time": float(state.get("black_time", 180.0)),
            "white_id": state.get("white_id"),
            "black_id": state.get("black_id"),
        }))

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
                    response = await EVENT_HANDLERS[event](r, m, game_id, user_id, data)
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
                        # Send all messages to the client, including their own moves,
                        # to ensure authoritative state (like timers) is synchronized.
                        await websocket.send_text(json.dumps(payload))
        finally:
            await pubsub.unsubscribe(f"game:{game_id}")
            await pubsub.close()

    # Run both tasks concurrently
    await asyncio.gather(ws_receiver(), pubsub_receiver())
