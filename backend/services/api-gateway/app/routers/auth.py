from fastapi import APIRouter, HTTPException, Depends, Request, Response
import httpx
from .proxy import proxy_request
from dotenv import load_dotenv
import os


load_dotenv()
USERS_SERVICE_URL = os.getenv("USERS_SERVICE_URL")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(request: Request):
    return await proxy_request(request, USERS_SERVICE_URL, request.url.path)


@router.post("/login")
async def login(request: Request):
    return await proxy_request(request, USERS_SERVICE_URL, request.url.path)


@router.post("/logout")
async def logout(request: Request):
    return await proxy_request(request, USERS_SERVICE_URL, request.url.path)
