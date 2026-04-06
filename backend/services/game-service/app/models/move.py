from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, UTC
import uuid
from app.db import Base


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
