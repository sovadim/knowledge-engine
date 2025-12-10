from typing import List

from fastapi import FastAPI, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware

from dto import Node, NodeStatus, NodeLevel
from graph import Graph

app = FastAPI()

# Add CORS middleware to allow frontend requests
# Must be added before routes are defined
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

graph: Graph = Graph()
last_node: Node = None

@app.get("/api/nodes", response_model=List[Node])
def list_nodes() -> List[Node]:
    """Return all nodes."""
    return graph.get_nodes()


@app.get("/api/nodes/{node_id}", response_model=Node)
def get_node(node_id: int) -> Node:
    """Return a single node by id."""
    node = graph.get(node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found",
        )
    return node


@app.post("/api/nodes", response_model=Node, status_code=status.HTTP_201_CREATED)
def create_node(payload: Node) -> Node:
    """Create a new node."""
    node = Node(**payload.model_dump())
    graph.add_node(node)
    return node


@app.delete("/api/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node(node_id: int) -> None:
    """Delete a node by id."""
    graph.delete(node_id)


@app.post("/api/edge", status_code=status.HTTP_201_CREATED)
def create_edge(from_id: int = Query(..., alias="from"), 
                to_id: int = Query(..., alias="to")):
    """Create a directed edge: from_id → to_id"""
    if from_id not in graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {from_id} not found",
        )

    if to_id not in graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {to_id} not found",
        )

    graph.add_edge(from_id, to_id)

    return {"message": f"Edge {from_id} -> {to_id} created"}


@app.delete("/api/edge", status_code=status.HTTP_204_NO_CONTENT)
def delete_edge(from_id: int = Query(..., alias="from"), 
                to_id: int = Query(..., alias="to")):
    """Delete a directed edge: from_id → to_id"""
    if from_id not in graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {from_id} not found",
        )

    if to_id not in graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {to_id} not found",
        )

    graph.delete_edge(from_id, to_id)


@app.post("/api/nodes/{node_id}/disable", status_code=status.HTTP_204_NO_CONTENT)
def disable_node(node_id: int) -> None:
    """Set node status to 'disabled'."""
    node = graph(node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found",
        )

    node.status = NodeStatus.DISABLED
    return None


@app.post("/api/nodes/{node_id}/enable", status_code=status.HTTP_204_NO_CONTENT)
def enable_node(node_id: int) -> None:
    """Set node status to 'not_reached'."""
    node = graph(node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found",
        )

    node.status = NodeStatus.NOT_REACHED
    return None


@app.post("/api/chat/start")
def chat_start(level: NodeLevel = Query(..., description="Interview level: A1, A2, or A3")):
    """
    Start the interview. Returns the first question.
    """
    global last_node
    graph.reset(level)
    last_node = graph.next()
    if last_node is not None:
        return {
            "question": last_node.question, # Graph returns nodes with non-None questions only
            "completed": False
        }
    else:
        return {
            "question": "No questions found.",
            "completed": True,
        }


@app.post("/api/chat/answer")
def chat_answer(answer: str):
    """
    Receive user's answer and return next question.
    """
    global last_node
    graph.mark_passed(last_node.id)
    last_node = graph.next()
    if last_node is not None:
        return {
            "question": last_node.question,
            "completed": False,
        }
    else:
        return {
            "question": "No more questions found.",
            "completed": True
        }


@app.post("/api/chat/stop")
def chat_stop():
    """
    Stop the interview.
    """
    return {
        "message": "stub message: interview stopped"
    }


@app.get("/ping")
def ping():
    return {"message": "pong"}
