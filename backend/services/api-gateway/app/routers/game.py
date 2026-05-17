from fastapi import APIRouter, Request, Depends, WebSocket
from starlette.websockets import WebSocketDisconnect

from .proxy import proxy_request, authenticate_user_ws
from dotenv import load_dotenv
import websockets
import asyncio
import os


load_dotenv()
GAME_SERVICE_URL = os.getenv("GAME_SERVICE_URL")


router = APIRouter(prefix="/game", tags=["game"])


@router.websocket("/{game_id}")
async def join_match(websocket: WebSocket, game_id: str):
    # Extract token from gateway request
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return

    await websocket.accept()

    # Proxy to game-service, passing the token along
    ws_url = GAME_SERVICE_URL.replace("http", "ws") + f"/ws/game/{game_id}?token={token}"
    try:
        async with websockets.connect(ws_url) as ws_to_game:
            async def forward_from_client():
                try:
                    while True:
                        data = await websocket.receive_text()
                        await ws_to_game.send(data)
                except WebSocketDisconnect:
                    pass

            async def forward_from_game_service():
                try:
                    while True:
                        response = await ws_to_game.recv()
                        await websocket.send_text(response)
                except websockets.ConnectionClosed:
                    pass

            await asyncio.gather(forward_from_client(), forward_from_game_service())

    except websockets.ConnectionClosed:
        await websocket.close()
    except WebSocketDisconnect:
        await ws_to_game.close()
    except Exception as e:
        print(f"Websocket proxy error: {e}")
        await websocket.close(code=1011)
