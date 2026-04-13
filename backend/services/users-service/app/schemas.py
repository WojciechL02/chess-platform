import uuid
from fastapi_users import schemas
from pydantic import Field, BaseModel
import datetime


class UserPublic(BaseModel):
    nickname: str = Field(...)
    email: str = Field(...)
    elo_rating: int = Field(...)


class UserRead(schemas.BaseUser[uuid.UUID]):
    nickname: str = Field(...)
    elo_rating: int = Field(...)


class UserCreate(schemas.BaseUserCreate):
    nickname: str = Field(..., min_length=5, max_length=50)


class UserUpdate(schemas.BaseUserUpdate):
    elo_rating: int | None = None
    nickname: str | None = None


class GameHistory(BaseModel):
    id: uuid.UUID
    white_nickname: str
    black_nickname: str
    status: str
    format: str
    winner_id: uuid.UUID | None
    created_at: datetime.datetime


class RatingHistoryRead(BaseModel):
    rating: int
    created_at: datetime.datetime


class WinRatio(BaseModel):
    format: str
    wins: int
    total: int
    ratio: float
