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


class NodeCreate(BaseModel):
    status: NodeStatus
    level: NodeLevel

    child_nodes: List[int] = []
    parent_nodes: List[int] = []

    questions: Optional[List[str]] = None
    criterias: Optional[List[str]] = None

class Node(NodeCreate):
    id: int
