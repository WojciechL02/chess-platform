from fastapi import APIRouter, Depends, HTTPException
from redis.asyncio import Redis
from pymongo import AsyncMongoClient

from common.schemas.move import MoveRequest


router = APIRouter(prefix="/internal/game", tags=["internal"])


@router.post("/{game_id}/move")
async def bot_move(game_id: str, move_data: dict, user_id: str):
    r =
    m =

    result = await perform_move()

    if result["status"]:
        raise HTTPException()

    return {"status": "success"}

