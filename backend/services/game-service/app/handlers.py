from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, UTC
import json
import chess
from .db import async_session_maker

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[3]))
from common.models.game import Game, Move


async def ensure_game_state_exists(redis: Redis, game_id: str):
    game_key = f"game_state_{game_id}"

    exists = await redis.exists(game_key)
    if not exists:
        async with async_session_maker() as session:
            game = await get_game_from_db(game_id, session)
            await redis.hset(game_key, mapping={
                "fen": chess.Board().fen(),
                "turn": str(game.white_id),
                "white_id": str(game.white_id),
                "black_id": str(game.black_id),
                "move_number": 0,
                "last_move_at": str(datetime.now().timestamp()),
            })


async def get_game_from_db(game_id: str, session: AsyncSession):
    result = await session.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()

    if game is None:
        raise ValueError(f"Game with id {game_id} not found")
    return game


async def handle_move(redis: Redis, game_id: str, user_id: str, data: dict):
    state = await redis.hgetall(f"game_state_{game_id}")
    turn = state.get("turn")
    next_move_number = str(int(state.get("move_number")) + 1)

    if user_id != turn:
        return {"status": "invalid"}

    board = chess.Board(state["fen"])
    move = chess.Move.from_uci(data["uci"])
    if move not in board.legal_moves:
        return {"status": "invalid"}

    board.push(move)
    next_turn = state["white_id"] if user_id == state["black_id"] else state["black_id"]

    await redis.hset(f"game_state_{game_id}", mapping={
        "fen": board.fen(),
        "turn": next_turn,
        "move_number": next_move_number,
        "last_move_at": str(datetime.now(UTC).timestamp())
    })

    await redis.publish(f"game:{game_id}", json.dumps({
        "event": "move",
        "user_id": user_id,
        "uci": data["uci"],
        "fen": board.fen(),
        "turn": next_turn,
    }))

    async with async_session_maker() as session:
        await create_move_in_database(game_id, user_id, int(next_move_number), data["uci"], board.fen(), session)

    return {"status": "success"}


async def create_move_in_database(game_id: str, user_id: str, move_number: int, uci: str, fen: str, session: AsyncSession):
    new_move = Move(
        game_id=game_id,
        player_id=user_id,
        move_number=move_number,
        uci=uci,
        fen=fen,
        created_at=datetime.now(),
    )
    session.add(new_move)
    await session.commit()


async def handle_resign(redis: Redis, game_id: str, user_id: str, data: dict):
    pass


async def handle_draw_offer(redis: Redis, game_id: str, user_id: str, data: dict):
    pass


async def handle_draw_accept(redis: Redis, game_id: str, user_id: str, data: dict):
    pass


EVENT_HANDLERS = {
    "move": handle_move,
    "resign": handle_resign,
    "draw_offer": handle_draw_offer,
    "draw_accept": handle_draw_accept,
}
