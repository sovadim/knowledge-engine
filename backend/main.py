


from typing import Dict, List, Optional, Tuple
import re
import uuid

from fastapi import FastAPI, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware

from dto import Node, NodeStatus, NodeLevel


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

nodes: Dict[int, Node] = {}

# Interview state management
interview_state: Dict[str, Dict] = {}


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


def get_root_nodes_with_questions() -> List[Node]:
    """Get all root nodes (nodes with no parents) that have questions."""
    return [node for node in nodes.values()
            if not node.parent_nodes and node.question]


def get_next_question_node(session_id: str) -> Optional[Node]:
    """Get the next node to ask a question for."""
    state = interview_state.get(session_id, {})
    visited = state.get("visited_nodes", set())
    current_node_id = state.get("current_node_id")

    # If we have a current node, check its children first
    if current_node_id:
        current_node = nodes.get(current_node_id)
        if current_node:
            # Check child nodes that haven't been visited
            for child_id in current_node.child_nodes:
                if child_id not in visited:
                    child_node = nodes.get(child_id)
                    if child_node and child_node.question:
                        # Check if all parents are visited or have no questions (can be skipped)
                        can_ask = all(
                            parent_id in visited or
                            (nodes.get(parent_id) and not nodes[parent_id].question)
                            for parent_id in child_node.parent_nodes
                        )
                        if can_ask:
                            return child_node

    # Find next unvisited root node with a question
    root_nodes = get_root_nodes_with_questions()
    for root in root_nodes:
        if root.id not in visited:
            return root

    # If no root nodes have questions, find children of root nodes that have questions
    root_nodes_all = [node for node in nodes.values() if not node.parent_nodes]
    for root in root_nodes_all:
        if root.id not in visited:
            # Check children of this root
            for child_id in root.child_nodes:
                if child_id not in visited:
                    child_node = nodes.get(child_id)
                    if child_node and child_node.question:
                        # Check if all parents are visited or have no questions
                        can_ask = all(
                            parent_id in visited or
                            (nodes.get(parent_id) and not nodes[parent_id].question)
                            for parent_id in child_node.parent_nodes
                        )
                        if can_ask:
                            return child_node

    # Find any unvisited node with a question (breadth-first approach)
    for node in nodes.values():
        if node.id not in visited and node.question:
            # Check if all parents are visited or have no questions (can be skipped)
            can_ask = all(
                parent_id in visited or
                (nodes.get(parent_id) and not nodes[parent_id].question)
                for parent_id in node.parent_nodes
            )
            if can_ask:
                return node

    return None


def evaluate_answer(answer: str, criteria_a1: Optional[str],
                   criteria_a2: Optional[str],
                   criteria_a3: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Evaluate answer against criteria.
    Returns (passed, level_achieved) where level_achieved is 'A1', 'A2', 'A3', or None
    """
    if not answer or not answer.strip():
        return False, None

    answer_lower = answer.lower().strip()

    # Check A3 criteria (most comprehensive)
    if criteria_a3:
        criteria_a3_lower = criteria_a3.lower()
        # Extract key concepts from criteria (words longer than 3 chars)
        key_terms = [term for term in re.findall(r'\b\w+\b', criteria_a3_lower) if len(term) > 3]
        if key_terms:
            matches = sum(1 for term in key_terms if term in answer_lower)
            if matches >= len(key_terms) * 0.4:  # At least 40% of key terms
                return True, "A3"

    # Check A2 criteria
    if criteria_a2:
        criteria_a2_lower = criteria_a2.lower()
        key_terms = [term for term in re.findall(r'\b\w+\b', criteria_a2_lower) if len(term) > 3]
        if key_terms:
            matches = sum(1 for term in key_terms if term in answer_lower)
            if matches >= len(key_terms) * 0.3:  # At least 30% of key terms
                return True, "A2"

    # Check A1 criteria (basic)
    if criteria_a1:
        criteria_a1_lower = criteria_a1.lower()
        key_terms = [term for term in re.findall(r'\b\w+\b', criteria_a1_lower) if len(term) > 3]
        if key_terms:
            matches = sum(1 for term in key_terms if term in answer_lower)
            if matches >= len(key_terms) * 0.2:  # At least 20% of key terms
                return True, "A1"

    return False, None


def update_node_status(node_id: int, passed: bool, level_achieved: Optional[str]):
    """Update node status based on evaluation."""
    node = nodes.get(node_id)
    if not node:
        return

    if passed:
        node.status = NodeStatus.PASSED
    else:
        node.status = NodeStatus.FAILED


@app.post("/api/chat/start")
def chat_start(level: NodeLevel = Query(..., description="Interview level: A1, A2, or A3")):
    """
    Start the interview. Returns the first question.
    """
    # Generate a session ID
    session_id = str(uuid.uuid4())
    
    # Initialize interview state
    interview_state[session_id] = {
        "visited_nodes": set(),
        "current_node_id": None,
    }
    
    # Find the first question node
    first_node = get_next_question_node(session_id)
    
    if not first_node:
        return {
            "question": "No questions available. Please add nodes with questions to the knowledge graph.",
            "session_id": session_id,
        }
    
    # Mark as in progress
    first_node.status = NodeStatus.IN_PROGRESS
    interview_state[session_id]["current_node_id"] = first_node.id
    
    return {
<<<<<<< Updated upstream
        "question": first_node.question,
        "session_id": session_id,
=======
        "question": f"stub message: the first question for level {level.value}"
>>>>>>> Stashed changes
    }


@app.post("/api/chat/answer")
def chat_answer(answer: str = Query(...), session_id: Optional[str] = Query(None)):
    """
    Receive user's answer and return next question.
    """
    if not session_id or session_id not in interview_state:
        # If no session_id provided, start a new interview
        return chat_start()
    
    state = interview_state[session_id]
    current_node_id = state.get("current_node_id")
    
    if not current_node_id:
        return {
            "question": "No active question. Please start a new interview.",
            "session_id": session_id,
        }
    
    current_node = nodes.get(current_node_id)
    if not current_node:
        return {
            "question": "Error: Current node not found.",
            "session_id": session_id,
        }
    
    # Evaluate the answer
    passed, level_achieved = evaluate_answer(
        answer,
        current_node.criteria_a1,
        current_node.criteria_a2,
        current_node.criteria_a3
    )
    
    # Update node status
    update_node_status(current_node_id, passed, level_achieved)
    
    # Mark as visited
    state["visited_nodes"].add(current_node_id)
    state["current_node_id"] = None
    
    # Find next question
    next_node = get_next_question_node(session_id)
    
    if not next_node:
        # Interview complete
        return {
            "question": "Interview complete! You have answered all available questions.",
            "session_id": session_id,
            "completed": True,
        }
    
    # Mark next node as in progress
    next_node.status = NodeStatus.IN_PROGRESS
    state["current_node_id"] = next_node.id
    
    return {
        "question": next_node.question,
        "session_id": session_id,
        "completed": False,
    }


@app.post("/api/chat/stop")
def chat_stop(session_id: Optional[str] = Query(None)):
    """
    Stop the interview.
    """
    if session_id and session_id in interview_state:
        state = interview_state[session_id]
        current_node_id = state.get("current_node_id")
        
        # Reset any in-progress nodes
        if current_node_id:
            current_node = nodes.get(current_node_id)
            if current_node and current_node.status == NodeStatus.IN_PROGRESS:
                # Reset to previous status or not_reached
                if current_node_id in state.get("visited_nodes", set()):
                    # Was already evaluated, keep status
                    pass
                else:
                    current_node.status = NodeStatus.NOT_REACHED
        
        # Clean up session
        del interview_state[session_id]
    
    return {
        "message": "Interview stopped successfully.",
        "session_id": session_id,
    }


@app.get("/ping")
def ping():
    return {"message": "pong"}
