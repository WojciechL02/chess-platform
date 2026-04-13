import uuid
from pydantic import BaseModel
from datetime import datetime, UTC
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum


Base = declarative_base()


class User(Base):
    __tablename__ = "user"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True)
    elo_rating = Column(Integer, default=1200)


class RatingHistory(Base):
    __tablename__ = "rating_history"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now(UTC), nullable=False)


class GameStatus(str, enum.Enum):
    waiting = "waiting"
    in_progress = "in_progress"
    finished = "finished"


class GameRules(BaseModel):
    total: float
    add: float


GAME_FORMATS = {
    "bullet": GameRules(total=60.0, add=1.0),
    "blitz": GameRules(total=180.0, add=2.0),
    "rapid": GameRules(total=600.0, add=0.0),
}


class GameFormat(str, enum.Enum):
    bullet = "bullet"
    blitz = "blitz"
    rapid = "rapid"

    @property
    def rules(self) -> GameRules:
        """Fetches the validated Pydantic model for this format."""
        return GAME_FORMATS[self.value]

    @property
    def total_time(self) -> float:
        return self.rules.total

    @property
    def increment(self) -> float:
        return self.rules.add


class Game(Base):
    __tablename__ = "games"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    white_id = Column(UUID(as_uuid=True), ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False)
    black_id = Column(UUID(as_uuid=True), ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(GameStatus), default=GameStatus.waiting, nullable=False)
    format = Column(Enum(GameFormat), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now(UTC), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    winner_id = Column(UUID(as_uuid=True), ForeignKey("public.user.id", ondelete="SET NULL"), nullable=True)

    def __repr__(self) -> str:
        return f"<Game(id={self.id}, status={self.status})>"
