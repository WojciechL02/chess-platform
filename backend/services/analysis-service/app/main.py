from contextlib import asynccontextmanager
from datetime import datetime, UTC
from fastapi import FastAPI, HTTPException

from .storage_utils import init_mongo, close_mongo
from .analysis import init_engine, close_engine, analyze_game, summarize


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_mongo(app)
    await init_engine(app)
    yield
    await close_engine(app)
    await close_mongo(app)


app = FastAPI(title="Analysis Service", lifespan=lifespan)


@app.get("/analysis/{game_id}")
async def get_analysis(game_id: str, force: bool = False):
    """
    Return cached analysis for a finished game, computing it if absent.
    Pass `?force=true` to recompute and overwrite the cache.
    """
    db = app.state.mongo["chess_db"]
    cache = db["analyses"]
    games = db["games"]

    if not force:
        cached = await cache.find_one({"_id": game_id})
        if cached:
            cached.pop("_id", None)
            return cached

    game_doc = await games.find_one({"_id": game_id})
    if game_doc is None:
        raise HTTPException(status_code=404, detail="Game not found")

    moves = game_doc.get("moves", [])
    if not moves:
        raise HTTPException(status_code=400, detail="Game has no recorded moves")

    analyzed = await analyze_game(app.state.engine, app.state.engine_lock, moves)

    payload = {
        "game_id": game_id,
        "winner_id": game_doc.get("winner_id"),
        "final_fen": game_doc.get("fen"),
        "move_count": len(analyzed),
        "summary": summarize(analyzed),
        "moves": analyzed,
        "analyzed_at": datetime.now(UTC).isoformat(),
    }

    await cache.replace_one({"_id": game_id}, {"_id": game_id, **payload}, upsert=True)
    return payload


@app.get("/health")
async def health():
    return {"status": "ok"}
