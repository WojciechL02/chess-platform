import uuid
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


class GameStatus(str, enum.Enum):
    waiting = "waiting"
    in_progress = "in_progress"
    finished = "finished"


class Game(Base):
    __tablename__ = "games"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    white_id = Column(UUID(as_uuid=True), ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False)
    black_id = Column(UUID(as_uuid=True), ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(GameStatus), default=GameStatus.waiting, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now(UTC), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    winner_id = Column(UUID(as_uuid=True), ForeignKey("public.user.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    moves = relationship("Move", back_populates="game", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Game(id={self.id}, status={self.status})>"


class Move(Base):
    __tablename__ = "moves"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id = Column(UUID(as_uuid=True), ForeignKey("public.games.id", ondelete="CASCADE"), nullable=False)
    player_id = Column(UUID(as_uuid=True), ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False)
    move_number = Column(Integer, nullable=False)
    uci = Column(String, nullable=False)
    fen = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)

    # Relationships
    game = relationship("Game", back_populates="moves")

    def __repr__(self) -> str:
        return f"<Move(id={self.id}, move_number={self.move_number}, uci={self.uci})>"
