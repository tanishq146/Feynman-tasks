from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()


class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    goal = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    reflection = Column(Text, nullable=True)
    connections = Column(JSON, default=list)
