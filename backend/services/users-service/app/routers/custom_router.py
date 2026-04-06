from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from app.db import User, get_async_session
from app.users import current_active_user
from app.schemas import UserPublic


router = APIRouter(prefix="/players", tags=["players"])

@router.get("/leaderboard", response_model=list[UserPublic])
async def leaderboard(limit = 10, session = Depends(get_async_session), user: User = Depends(current_active_user)):
    result = await session.execute(
        select(User).order_by(desc(User.elo_rating)).limit(limit)
    )
    return result.scalars().all()
