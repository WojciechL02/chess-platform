import os
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Request

from .proxy import proxy_request, authenticate_user


load_dotenv()
ANALYSIS_SERVICE_URL = os.getenv("ANALYSIS_SERVICE_URL")


router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/{game_id}")
async def get_analysis(game_id: str, request: Request, user=Depends(authenticate_user)):
    return await proxy_request(request, ANALYSIS_SERVICE_URL, request.url.path)
