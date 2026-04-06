import httpx
from fastapi import Request, Response, HTTPException
from dotenv import load_dotenv
import os

from starlette.websockets import WebSocket

load_dotenv()
USERS_SERVICE_URL = os.getenv("USERS_SERVICE_URL")


async def proxy_request(request: Request, base_url: str, path: str) -> Response:
    url = f"{base_url}{path}"

    async with httpx.AsyncClient() as client:
        body = await request.body()
        proxy_response = await client.request(
            request.method,
            url,
            headers=dict(request.headers),
            content=body,
        )

    return Response(
        content=proxy_response.content,
        status_code=proxy_response.status_code,
        headers=dict(proxy_response.headers),
        media_type=proxy_response.headers.get("content-type"),
    )


async def authenticate_user(request: Request):
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    url = f"{USERS_SERVICE_URL}/users/me"
    print("URL:", url)
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            method="GET",
            url=url,
            headers=dict(request.headers),
        )
        if resp.status_code != 200:
            print("STATUS CODE:", resp.status_code)

            raise HTTPException(status_code=resp.status_code, detail="Invalid or inactive user")
        return resp.json()


async def authenticate_user_ws(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return None

    url = f"{USERS_SERVICE_URL}/users/me"
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            await websocket.close(code=4401)
            return None
        return resp.json()
