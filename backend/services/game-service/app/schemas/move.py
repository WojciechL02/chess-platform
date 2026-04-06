from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class MoveBase(BaseModel):
    move_number: int
    uci: str
    fen: str


class MoveCreate(MoveBase):
    game_id: UUID
    player_id: UUID


class MoveRead(MoveBase):
    id: UUID
    game_id: UUID
    player_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True
