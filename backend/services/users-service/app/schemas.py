import uuid
from fastapi_users import schemas
from pydantic import Field, BaseModel


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
