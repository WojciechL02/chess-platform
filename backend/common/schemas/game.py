from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import BaseModel


class GameStatus(str, Enum):
    waiting = "waiting"
    in_progress = "in_progress"
    finished = "finished"


class GameFormat(str, Enum):
    bullet = "bullet"
    blitz = "blitz"
    rapid = "rapid"


class GameBase(BaseModel):
    white_id: UUID
    black_id: UUID
    status: GameStatus = GameStatus.waiting


class GameCreate(GameBase):
    pass


class GameRead(GameBase):
    id: UUID
    status: GameStatus
    format: GameFormat
    created_at: datetime
    started_at: datetime | None = None
    ended_at: datetime | None = None
    winner_id: UUID | None = None

    class Config:
        orm_mode = True
