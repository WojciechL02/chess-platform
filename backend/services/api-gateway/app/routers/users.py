from fastapi import APIRouter, Request
from .proxy import proxy_request
from dotenv import load_dotenv
import os


load_dotenv()
USERS_SERVICE_URL = os.getenv("USERS_SERVICE_URL")


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_me(request: Request):
    return await proxy_request(request, USERS_SERVICE_URL, request.url.path)
