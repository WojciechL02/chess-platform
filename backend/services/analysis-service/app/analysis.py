import asyncio
import os
from dataclasses import dataclass, asdict
from dotenv import load_dotenv
import chess
import chess.engine


load_dotenv()
STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "stockfish")
ANALYSIS_DEPTH = int(os.getenv("ANALYSIS_DEPTH", "12"))
MATE_SCORE = 10_000


@dataclass
class MoveAnalysis:
    move_number: int
    uci: str
    san: str
    player_color: str  # "white" | "black"
    eval_before: int   # centipawns, from moving player's POV
    eval_after: int    # centipawns, from moving player's POV
    centipawn_loss: int
    best_move_uci: str
    best_move_san: str
    classification: str


async def init_engine(app):
    """Open one Stockfish process for the lifetime of the service."""
    transport, engine = await chess.engine.popen_uci(STOCKFISH_PATH)
    app.state.engine_transport = transport
    app.state.engine = engine
    app.state.engine_lock = asyncio.Lock()


async def close_engine(app):
    engine = getattr(app.state, "engine", None)
    if engine is not None:
        await engine.quit()


def _classify(centipawn_loss: int, is_best: bool) -> str:
    """Standard centipawn-loss buckets. is_best wins over thresholds."""
    if is_best:
        return "best"
    if centipawn_loss < 20:
        return "excellent"
    if centipawn_loss < 50:
        return "good"
    if centipawn_loss < 100:
        return "inaccuracy"
    if centipawn_loss < 200:
        return "mistake"
    return "blunder"


def _score_cp(info: dict, color: chess.Color) -> int:
    """Centipawn score from the given color's POV, with mate normalized to MATE_SCORE."""
    return info["score"].pov(color).score(mate_score=MATE_SCORE)


async def analyze_game(
    engine: chess.engine.UciProtocol,
    lock: asyncio.Lock,
    moves: list[dict],
    depth: int = ANALYSIS_DEPTH,
) -> list[dict]:
    """
    Replay a game's UCI move list and score each ply with Stockfish.

    `moves` is the list stored in Mongo by game-service: each item has
    `move_number`, `player_id`, `uci`, `fen` (position AFTER the move),
    and `timestamp`. We rebuild positions from the standard start.
    """
    board = chess.Board()
    limit = chess.engine.Limit(depth=depth)
    results: list[MoveAnalysis] = []

    async with lock:
        for entry in moves:
            uci = entry["uci"]
            try:
                move = chess.Move.from_uci(uci)
            except ValueError:
                continue
            if move not in board.legal_moves:
                # Stored game is inconsistent; bail rather than mis-attribute blame.
                break

            mover = board.turn  # color to move BEFORE the move
            san = board.san(move)

            # Eval the current position: what does best play look like?
            info_before = await engine.analyse(board, limit)
            eval_before = _score_cp(info_before, mover)
            best_move = info_before.get("pv", [None])[0]
            best_move_uci = best_move.uci() if best_move else ""
            best_move_san = board.san(best_move) if best_move else ""

            # Play the actual move, then eval the resulting position.
            board.push(move)
            info_after = await engine.analyse(board, limit)
            # Flip POV so both numbers are from the mover's side.
            eval_after = _score_cp(info_after, mover)

            loss = max(0, eval_before - eval_after)
            is_best = best_move is not None and best_move.uci() == uci

            results.append(MoveAnalysis(
                move_number=entry.get("move_number", len(results) + 1),
                uci=uci,
                san=san,
                player_color="white" if mover == chess.WHITE else "black",
                eval_before=eval_before,
                eval_after=eval_after,
                centipawn_loss=loss,
                best_move_uci=best_move_uci,
                best_move_san=best_move_san,
                classification=_classify(loss, is_best),
            ))

    return [asdict(r) for r in results]


def summarize(analyzed_moves: list[dict]) -> dict:
    """Per-color counts of each classification + average centipawn loss."""
    buckets = ("best", "excellent", "good", "inaccuracy", "mistake", "blunder")
    summary = {
        "white": {b: 0 for b in buckets} | {"avg_centipawn_loss": 0.0, "moves": 0},
        "black": {b: 0 for b in buckets} | {"avg_centipawn_loss": 0.0, "moves": 0},
    }
    totals = {"white": 0, "black": 0}

    for m in analyzed_moves:
        color = m["player_color"]
        summary[color][m["classification"]] += 1
        summary[color]["moves"] += 1
        totals[color] += m["centipawn_loss"]

    for color in ("white", "black"):
        n = summary[color]["moves"]
        if n:
            summary[color]["avg_centipawn_loss"] = round(totals[color] / n, 1)

    return summary
