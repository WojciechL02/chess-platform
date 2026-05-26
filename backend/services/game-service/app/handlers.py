from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, UTC
import json
import chess
from pymongo import AsyncMongoClient
from .db import async_session_maker

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[3]))
from common.models.game import Game, GameStatus, GameFormat, User, RatingHistory


async def save_to_document_store(mongo: AsyncMongoClient, game_id: str, moves: list, final_fen: str, winner_id: str):
    """
    Dumps the entire game history to the document store.
    """
    db = mongo["chess_db"]
    games = db["games"]

    game_doc = {
        "_id": game_id,
        "moves": moves,
        "winner_id": winner_id,
        "fen": final_fen,
    }
    result = await games.insert_one(game_doc)
    return str(result.inserted_id)


async def ensure_game_state_exists(redis: Redis, game_id: str):
    game_key = f"game_state_{game_id}"
    moves_key = f"game_moves_{game_id}"

    exists = await redis.exists(game_key)
    if not exists:
        async with async_session_maker() as session:
            game = await get_game_from_db(game_id, session)
            enum_format = GameFormat(game.format)

            if game.status == GameStatus.finished:
                return

            # Note: If game is in_progress but Redis state was lost,
            # we initialize a new board if it's a new or resumed game.

            await redis.hset(game_key, mapping={
                "format": game.format,
                "fen": chess.Board().fen(),
                "turn": str(game.white_id),
                "white_id": str(game.white_id),
                "black_id": str(game.black_id),
                "white_time": enum_format.total_time,
                "black_time": enum_format.total_time,
                "move_number": 0,
                "last_move_at": str(datetime.now(UTC).timestamp()),
            })
            if not await redis.exists(moves_key):
                await redis.delete(moves_key)


async def get_game_from_db(game_id: str, session: AsyncSession):
    result = await session.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()

    if game is None:
        raise ValueError(f"Game with id {game_id} not found")
    return game


async def update_elo(session: AsyncSession, game: Game, winner_id: str | None):
    # Fetch current ratings
    white_res = await session.execute(select(User).where(User.id == game.white_id))
    white = white_res.scalar_one()
    black_res = await session.execute(select(User).where(User.id == game.black_id))
    black = black_res.scalar_one()

    # Simple ELO calculation
    K = 32
    expected_white = 1 / (1 + 10 ** ((black.elo_rating - white.elo_rating) / 400))
    expected_black = 1 / (1 + 10 ** ((white.elo_rating - black.elo_rating) / 400))

    if winner_id == str(game.white_id):
        score_white, score_black = 1, 0
    elif winner_id == str(game.black_id):
        score_white, score_black = 0, 1
    else:
        score_white, score_black = 0.5, 0.5

    new_white_elo = round(white.elo_rating + K * (score_white - expected_white))
    new_black_elo = round(black.elo_rating + K * (score_black - expected_black))

    white.elo_rating = new_white_elo
    black.elo_rating = new_black_elo

    session.add(RatingHistory(user_id=white.id, rating=new_white_elo))
    session.add(RatingHistory(user_id=black.id, rating=new_black_elo))


async def finalize_game(redis: Redis, mongo: AsyncMongoClient, game_id: str, status: GameStatus, fen: str, winner_id: str | None = None):
    """
    Finalizes the game by saving the history to the document store
    and updating the relational database status.
    """
    moves_key = f"game_moves_{game_id}"
    game_key = f"game_state_{game_id}"

    # 1. Fetch all moves from Redis
    moves_json = await redis.lrange(moves_key, 0, -1)
    moves = [json.loads(m) for m in moves_json]

    # 2. Save dump to Document Store
    await save_to_document_store(mongo, game_id, moves, fen, winner_id)

    # 3. Update SQL Database
    async with async_session_maker() as session:
        game_result = await session.execute(select(Game).where(Game.id == game_id))
        game = game_result.scalar_one()
        
        # Update ELO
        await update_elo(session, game, winner_id)
        
        game.status = status
        game.winner_id = winner_id
        game.ended_at = datetime.now(UTC)
        
        await session.commit()

    # 4. Cleanup Redis
    await redis.delete(game_key, moves_key)

    # 5. Notify players
    winner_name = None
    if winner_id:
        winner_data = await redis.hgetall(f"user:{winner_id}")
        winner_name = winner_data.get("nickname", "Unknown")

    await redis.publish(f"game:{game_id}", json.dumps({
        "event": "game_over",
        "status": status,
        "winner_id": str(winner_id) if winner_id else None,
        "winner_name": winner_name
    }))


async def handle_move(redis: Redis, mongo: AsyncMongoClient, game_id: str, user_id: str, data: dict):
    move_timestamp = datetime.now(UTC).timestamp()
    game_key = f"game_state_{game_id}"
    moves_key = f"game_moves_{game_id}"

    state = await redis.hgetall(game_key)
    if not state:
        return {"status": "error", "message": "Game state not found"}

    turn = state.get("turn")
    next_move_number = int(state.get("move_number")) + 1

    if user_id != turn:
        return {"status": "invalid", "message": "Not your turn"}

    board = chess.Board(state["fen"])
    try:
        move = chess.Move.from_uci(data["uci"])
    except ValueError:
        return {"status": "invalid", "message": "Invalid UCI move format"}

    if move not in board.legal_moves:
        return {"status": "invalid", "message": "Illegal move"}

    elapsed = float(move_timestamp) - float(state["last_move_at"])
    remaining_time = float(state["white_time"]) - elapsed if state["turn"] == state["white_id"] else float(state["black_time"]) - elapsed
    if remaining_time <= 0:
        # game over
        if state["turn"] == state["white_id"]:
            winner_id = state["black_id"]
            await finalize_game(redis, mongo, game_id, GameStatus.finished, board.fen(), winner_id)
        else:
            winner_id = state["white_id"]
            await finalize_game(redis, mongo, game_id, GameStatus.finished, board.fen(), winner_id)
        return {"status": "success"}

    remaining_time += GameFormat(state["format"]).increment
    board.push(move)
    next_turn = state["white_id"] if user_id == state["black_id"] else state["black_id"]

    # Store move in Redis history
    move_data = {
        "move_number": next_move_number,
        "player_id": user_id,
        "uci": data["uci"],
        "fen": board.fen(),
        "timestamp": datetime.now(UTC).timestamp()
    }
    await redis.rpush(moves_key, json.dumps(move_data))

    # Update current state in Redis
    current_state = {
        "fen": board.fen(),
        "turn": next_turn,
        "white_time": remaining_time if state["turn"] == state["white_id"] else state["white_time"],
        "black_time": remaining_time if state["turn"] == state["black_id"] else state["white_time"],
        "move_number": next_move_number,
        "last_move_at": str(move_timestamp)
    }
    await redis.hset(game_key, mapping=current_state)

    # Broadcast move
    await redis.publish(f"game:{game_id}", json.dumps({
        "event": "move",
        "user_id": user_id,
        "uci": data["uci"],
        "fen": board.fen(),
        "turn": next_turn,
        "white_time": current_state["white_time"],
        "black_time": current_state["black_time"],
    }))

    # Check for game over
    if board.is_game_over():
        result = board.result()
        winner_id = None
        if result == "1-0":
            winner_id = state["white_id"]
        elif result == "0-1":
            winner_id = state["black_id"]

        await finalize_game(redis, mongo, game_id, GameStatus.finished, board.fen(), winner_id)

    return {"status": "success"}


async def handle_resign(redis: Redis, mongo: AsyncMongoClient, game_id: str, user_id: str, data: dict):
    state = await redis.hgetall(f"game_state_{game_id}")
    if not state:
        return {"status": "error", "message": "Game not found"}

    winner_id = state["white_id"] if user_id == state["black_id"] else state["black_id"]
    await finalize_game(redis, mongo, game_id, GameStatus.finished, state["fen"], winner_id)
    return {"status": "success"}


async def handle_draw_offer(redis: Redis, mongo: AsyncMongoClient, game_id: str, user_id: str, data: dict):
    # For now, just broadcast the offer
    await redis.publish(f"game:{game_id}", json.dumps({
        "event": "draw_offer",
        "offered_by": user_id
    }))
    return {"status": "success"}


async def handle_draw_accept(redis: Redis, mongo: AsyncMongoClient, game_id: str, user_id: str, data: dict):
    game_key = f"game_state_{game_id}"
    state = await redis.hgetall(game_key)
    if not state:
        return {"status": "error", "message": "Game state not found"}

    await finalize_game(redis, mongo, game_id, GameStatus.finished, state["fen"], winner_id=None)
    return {"status": "success"}


async def handle_draw_decline(redis: Redis, mongo: AsyncMongoClient, game_id: str, user_id: str, data: dict):
    await redis.publish(f"game:{game_id}", json.dumps({
        "event": "draw_declined",
        "declined_by": user_id
    }))
    return {"status": "success"}


EVENT_HANDLERS = {
    "move": handle_move,
    "resign": handle_resign,
    "draw_offer": handle_draw_offer,
    "draw_accept": handle_draw_accept,
    "draw_decline": handle_draw_decline,
}
