import os
import asyncio
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json
from dotenv import load_dotenv
from .storage_utils import init_redis, close_redis, init_mongo, close_mongo

load_dotenv()
LLM_INFERENCE_URL = os.getenv("LLM_INFERENCE_URL")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    await init_redis(app)
    await init_mongo(app)
    yield
    # shutdown
    await close_redis(app)
    await close_mongo(app)


app = FastAPI(title="Bot service", lifespan=None)


async def fetch_bot_move(game_key: str, current_fen: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                LLM_INFERENCE_URL,
                json={"fen": current_fen},
                timeout=3.0,
            )

            bot_move = response.json().get("move")
            # TODO: Update redis game state

    except httpx.TimeoutException:
        print("Bot loses on time.")
    except Exception as e:
        print(f"Bot crashed: {e}")


@app.websocket("/ws/play/bot/{game_id}")
async def bot_match_endpoint(websocket: WebSocket, game_id: str):
    await websocket.accept()
    r = websocket.app.state.redis
    m = websocket.app.state.mongo

    # TODO: Ensure game state exists
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





    game_key = f"game:{game_id}"

    try:
        while True:
            data = await websocket.receive_json()
            human_move = data.get("move")

            # MOVE VALIDATION
            # UPDATE REDIS GAME STATE
            current_fen = None

            asyncio.create_task(fetch_bot_move(game_key, current_fen))

    except WebSocketDisconnect:
        pass
