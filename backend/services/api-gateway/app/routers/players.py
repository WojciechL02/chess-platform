from fastapi import APIRouter, HTTPException, Depends, Request, Response
from .proxy import proxy_request
from dotenv import load_dotenv
import os


load_dotenv()
USERS_SERVICE_URL = os.getenv("USERS_SERVICE_URL")

router = APIRouter(prefix="/players", tags=["players"])


@router.get("/leaderboard")
async def register(request: Request):
    return await proxy_request(request, USERS_SERVICE_URL, request.url.path)
