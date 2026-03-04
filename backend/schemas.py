from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class MemoryCreate(BaseModel):
    content: str
    goal: str


class MemoryResponse(BaseModel):
    id: int
    content: str
    goal: str
    created_at: datetime
    reflection: Optional[str] = None
    connections: List[int] = []

    class Config:
        from_attributes = True


class GraphNode(BaseModel):
    id: int
    content: str
    goal: str
    reflection: Optional[str] = None


class GraphEdge(BaseModel):
    source: int
    target: int


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
