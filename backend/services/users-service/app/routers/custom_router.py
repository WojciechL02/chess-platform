from fastapi import APIRouter, Depends
from sqlalchemy import select, desc, or_
from app.db import User, get_async_session
from app.users import current_active_user
from app.schemas import UserPublic, GameHistory, RatingHistoryRead, WinRatio
from sqlalchemy.orm import aliased
import sys
from pathlib import Path

# Add project root to sys.path for common models
sys.path.append(str(Path(__file__).resolve().parents[4]))
from common.models.game import Game, RatingHistory


router = APIRouter(prefix="/players", tags=["players"])

@router.get("/leaderboard", response_model=list[UserPublic])
async def leaderboard(limit = 10, session = Depends(get_async_session), user: User = Depends(current_active_user)):
    result = await session.execute(
        select(User).order_by(desc(User.elo_rating)).limit(limit)
    )
    return result.scalars().all()

@router.get("/history", response_model=list[GameHistory])
async def history(session = Depends(get_async_session), user: User = Depends(current_active_user)):
    WhiteUser = aliased(User)
    BlackUser = aliased(User)
    
    stmt = (
        select(
            Game.id,
            WhiteUser.nickname.label("white_nickname"),
            BlackUser.nickname.label("black_nickname"),
            Game.status,
            Game.format,
            Game.winner_id,
            Game.created_at
        )
        .join(WhiteUser, Game.white_id == WhiteUser.id)
        .join(BlackUser, Game.black_id == BlackUser.id)
        .where(or_(Game.white_id == user.id, Game.black_id == user.id))
        .order_by(desc(Game.created_at))
        .limit(5)
    )
    
    result = await session.execute(stmt)
    return result.all()

@router.get("/rating-history", response_model=list[RatingHistoryRead])
async def rating_history(session = Depends(get_async_session), user: User = Depends(current_active_user)):
    result = await session.execute(
        select(RatingHistory.rating, RatingHistory.created_at)
        .where(RatingHistory.user_id == user.id)
        .order_by(RatingHistory.created_at)
    )
    return result.all()

@router.get("/win-ratios", response_model=list[WinRatio])
async def win_ratios(session = Depends(get_async_session), user: User = Depends(current_active_user)):
    from sqlalchemy import func
    
    # Simple aggregation for win ratios
    stmt = (
        select(
            Game.format,
            func.count(Game.id).label("total"),
            func.count(Game.id).filter(Game.winner_id == user.id).label("wins")
        )
        .where(or_(Game.white_id == user.id, Game.black_id == user.id))
        .where(Game.status == "finished")
        .group_by(Game.format)
    )
    
    result = await session.execute(stmt)
    rows = result.all()
    
    ratios = []
    for row in rows:
        ratios.append({
            "format": row.format,
            "wins": row.wins,
            "total": row.total,
            "ratio": row.wins / row.total if row.total > 0 else 0
        })
    return ratios
