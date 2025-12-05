from typing import Dict, List

from fastapi import FastAPI, HTTPException, status

from dto import Node


app = FastAPI()

nodes: Dict[int, Node] = {}


@app.get("/api/nodes", response_model=List[Node])
def list_nodes() -> List[Node]:
    """Return all nodes."""
    return list(nodes.values())


@app.get("/api/nodes/{node_id}", response_model=Node)
def get_node(node_id: int) -> Node:
    """Return a single node by id."""
    node = nodes.get(node_id)
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
    nodes[node.id] = node
    return node


@app.delete("/api/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node(node_id: int) -> None:
    """Delete a node by id."""
    if node_id not in nodes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found",
        )
    del nodes[node_id]
    return None


@app.get("/ping")
def ping():
    return {"message": "pong"}
