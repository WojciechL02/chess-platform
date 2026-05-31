import os
import jwt
from fastapi import HTTPException, WebSocket, status
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

async def get_user_from_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM], audience="fastapi-users:auth")
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return {"id": user_id}
    except jwt.PyJWTError:
        return None

async def authenticate_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None
    
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None
    
    return user
