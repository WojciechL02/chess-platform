from fastapi import APIRouter, Request, Depends, WebSocket
from starlette.websockets import WebSocketDisconnect

from .proxy import proxy_request, authenticate_user_ws
from dotenv import load_dotenv
import websockets
import json
import os


load_dotenv()
MATCHMAKING_SERVICE_URL = os.getenv("MATCHMAKING_SERVICE_URL")


router = APIRouter(prefix="/match", tags=["matchmaking"])


@router.websocket("/join")
async def join_match(websocket: WebSocket, user=Depends(authenticate_user_ws)):
    await websocket.accept()

    ws_url = MATCHMAKING_SERVICE_URL.replace("http", "ws") + "/ws/join"
    try:
        async with websockets.connect(ws_url) as ws_to_mm:
            # 1. Receive format from client
            client_msg = await websocket.receive_text()
            client_data = json.loads(client_msg)
            game_format = client_data.get("game_format", "blitz")

            # 2. Proxy to matchmaker
            data = {
                "user_id": user["id"],
                "elo": user["elo_rating"],
                "nickname": user["nickname"],
                "game_format": game_format,
            }
            await ws_to_mm.send(json.dumps(data))

            # 3. Wait for match and relay back
            response = await ws_to_mm.recv()
            await websocket.send_text(response)
            await ws_to_mm.close()
            await websocket.close()

    except Exception as e:
        print(f"Websocket proxy error: {e}")
        await websocket.close(code=1011)


# @router.post("/leave")
# async def leave_match(request: Request, user=Depends(authenticate_user)):
#     return await proxy_request(request, MATCHMAKING_SERVICE_URL, request.url.path)
