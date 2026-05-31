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
async def join_match(websocket: WebSocket):
    # Extract token from gateway request
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return

    await websocket.accept()

    ws_url = MATCHMAKING_SERVICE_URL.replace("http", "ws") + f"/match/join?token={token}"
    try:
        async with websockets.connect(ws_url) as ws_to_mm:
            # 1. Forward the first message (containing game_format)
            client_msg = await websocket.receive_text()
            await ws_to_mm.send(client_msg)

            # 2. Wait for match and relay back
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
