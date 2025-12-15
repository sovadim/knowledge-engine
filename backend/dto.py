from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class NodeStatus(str, Enum):
    PASSED = "passed"
    FAILED = "failed"
    IN_PROGRESS = "in_progress"
    NOT_REACHED = "not_reached"
    DISABLED = "disabled"


class NodeLevel(str, Enum):
    A1 = "A1"
    A2 = "A2"
    A3 = "A3"


class Node(BaseModel):
    id: int
    name: str

    status: Optional[NodeStatus] = NodeStatus.NOT_REACHED
    level: NodeLevel
    score: int = 0

    child_nodes: List[int] = []
    parent_nodes: List[int] = []

    question: Optional[str] = None
    criteria: Optional[str] = None


class NodeEditPayload(BaseModel):
    level: Optional[NodeLevel] = None
    question: Optional[str] = None
    criteria: Optional[str] = None


class ApiKeyRequest(BaseModel):
    key: str
