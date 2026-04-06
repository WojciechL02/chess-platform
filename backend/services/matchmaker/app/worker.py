import asyncio
import json
from datetime import datetime, UTC
from uuid import uuid4
import random
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from .db import async_session_maker

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[3]))
from common.models.game import Game


MATCHMAKING_QUEUE = "matchmaking_queue"


async def matchmaking_worker(app):
    while True:
        players = await app.state.redis.zrange(MATCHMAKING_QUEUE, 0, -1, withscores=True)
        match = await find_match(app, players)
        if match:
            white_id, black_id = match
            game_id = str(uuid4())
            await app.state.redis.zrem(MATCHMAKING_QUEUE, white_id, black_id)

            async with async_session_maker() as session:
                await create_game_in_database(game_id, white_id, black_id, session)

            event = {
                "event": "match_found",
                "game_id": game_id,
                "players": {
                    "white": white_id,
                    "black": black_id,
                }
            }
            await app.state.redis.publish("matches", json.dumps(event))
        await asyncio.sleep(1)


async def find_match(app, players):
    for i, (player_id, player_elo) in enumerate(players):
        player_data = await app.state.redis.hgetall(f"user:{player_id}")
        joined_at = float(player_data.get("joined_at", 0))

        for j, (opponent_id, opponent_elo) in enumerate(players[i + 1:], start=i + 1):
            if opponent_id == player_id:
                continue

            # Rule 1: elo within +-100
            # Rule 2: waiting time > 120s
            elo_diff = abs(float(opponent_elo) - float(player_elo))
            wait_time = datetime.now(UTC).timestamp() - joined_at
            if elo_diff <= 100 or wait_time > 120:
                if random.choice([True, False]):
                    white_id, black_id = player_id, opponent_id
                else:
                    white_id, black_id = opponent_id, player_id
                return white_id, black_id
    return None


async def create_game_in_database(game_id: str, white_id: str, black_id: str, session: AsyncSession):
    new_game = Game(
        id=game_id,
        white_id=white_id,
        black_id=black_id,
        created_at=datetime.now(UTC),
    )
    session.add(new_game)
    await session.commit()
