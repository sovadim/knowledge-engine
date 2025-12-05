from typing import Dict, List

from fastapi import FastAPI, HTTPException, status, Query

from dto import Node, NodeStatus


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


@app.post("/api/edge", status_code=status.HTTP_201_CREATED)
def create_edge(from_id: int = Query(..., alias="from"), 
                to_id: int = Query(..., alias="to")):
    """Create a directed edge: from_id → to_id"""
    if from_id not in nodes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {from_id} not found",
        )
    if to_id not in nodes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {to_id} not found",
        )

    src = nodes[from_id]
    dst = nodes[to_id]

    # Avoid duplicates
    if to_id not in src.child_nodes:
        src.child_nodes.append(to_id)
    if from_id not in dst.parent_nodes:
        dst.parent_nodes.append(from_id)

    return {"message": f"Edge {from_id} -> {to_id} created"}


@app.delete("/api/edge", status_code=status.HTTP_204_NO_CONTENT)
def delete_edge(from_id: int = Query(..., alias="from"), 
                to_id: int = Query(..., alias="to")):
    """Delete a directed edge: from_id → to_id"""
    if from_id not in nodes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {from_id} not found",
        )
    if to_id not in nodes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {to_id} not found",
        )

    src = nodes[from_id]
    dst = nodes[to_id]

    # Remove if exists
    if to_id in src.child_nodes:
        src.child_nodes.remove(to_id)
    if from_id in dst.parent_nodes:
        dst.parent_nodes.remove(from_id)

    return None


@app.post("/api/nodes/{node_id}/disable", status_code=status.HTTP_204_NO_CONTENT)
def disable_node(node_id: int) -> None:
    """Set node status to 'disabled'."""
    node = nodes.get(node_id)
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
    node = nodes.get(node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found",
        )

    node.status = NodeStatus.NOT_REACHED
    return None


@app.get("/ping")
def ping():
    return {"message": "pong"}
