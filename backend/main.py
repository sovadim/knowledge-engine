from typing import Dict, List, Optional, Tuple
import re
import uuid

from fastapi import FastAPI, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware

from dto import Node, NodeStatus


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

nodes: Dict[int, Node] = {}

# Interview state management (in production, use a proper session store)
interview_state: Dict[str, Dict] = {}


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
                        # Check if all parents are visited
                        if all(parent_id in visited for parent_id in child_node.parent_nodes):
                            return child_node
    
    # Find next unvisited root node with a question
    root_nodes = get_root_nodes_with_questions()
    for root in root_nodes:
        if root.id not in visited:
            return root
    
    # Find any unvisited node with a question (breadth-first approach)
    for node in nodes.values():
        if node.id not in visited and node.question:
            # Check if all parents are visited
            if all(parent_id in visited for parent_id in node.parent_nodes):
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


@app.post("/api/chat/start")
def chat_start():
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
    
    # Find first question (root node with a question)
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
        "question": first_node.question,
        "session_id": session_id,
    }


@app.post("/api/chat/answer")
def chat_answer(answer: str, session_id: str = Query(None)):
    """
    Receive user's answer and return next question.
    """
    if not session_id or session_id not in interview_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or missing session_id. Please start the interview first.",
        )
    
    state = interview_state[session_id]
    current_node_id = state.get("current_node_id")
    
    if not current_node_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No current question. Please start the interview first.",
        )
    
    current_node = nodes.get(current_node_id)
    if not current_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Current node {current_node_id} not found.",
        )
    
    # Evaluate the answer
    passed, level_achieved = evaluate_answer(
        answer,
        current_node.criteria_a1,
        current_node.criteria_a2,
        current_node.criteria_a3,
    )
    
    # Update node status
    update_node_status(current_node_id, passed, level_achieved)
    
    # Mark node as visited
    state["visited_nodes"].add(current_node_id)
    
    # Find next question
    next_node = get_next_question_node(session_id)
    
    if not next_node:
        # Interview complete
        passed_count = sum(1 for nid in state["visited_nodes"] 
                          if nodes.get(nid) and nodes[nid].status == NodeStatus.PASSED)
        total_count = len(state["visited_nodes"])
        
        return {
            "question": f"Interview complete! You answered {passed_count} out of {total_count} questions correctly.",
            "session_id": session_id,
            "completed": True,
        }
    
    # Set next node as current and mark as in progress
    next_node.status = NodeStatus.IN_PROGRESS
    state["current_node_id"] = next_node.id
    
    # Build response message
    feedback = ""
    if passed:
        feedback = f"Good answer! You achieved level {level_achieved}. "
    else:
        feedback = "Let's try another question. "
    
    return {
        "question": f"{feedback}Next question: {next_node.question}",
        "session_id": session_id,
    }


@app.post("/api/chat/stop")
def chat_stop(session_id: str = Query(None)):
    """
    Stop the interview and return summary.
    """
    if not session_id or session_id not in interview_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or missing session_id.",
        )
    
    state = interview_state[session_id]
    visited_nodes = state.get("visited_nodes", set())
    
    # Calculate summary
    passed_nodes = []
    failed_nodes = []
    in_progress_nodes = []
    
    for node_id in visited_nodes:
        node = nodes.get(node_id)
        if node:
            if node.status == NodeStatus.PASSED:
                passed_nodes.append(node.name)
            elif node.status == NodeStatus.FAILED:
                failed_nodes.append(node.name)
            elif node.status == NodeStatus.IN_PROGRESS:
                in_progress_nodes.append(node.name)
                # Reset in-progress nodes to not_reached
                node.status = NodeStatus.NOT_REACHED
    
    # Also reset current node if it's in progress
    current_node_id = state.get("current_node_id")
    if current_node_id:
        current_node = nodes.get(current_node_id)
        if current_node and current_node.status == NodeStatus.IN_PROGRESS:
            current_node.status = NodeStatus.NOT_REACHED
    
    # Build summary message
    summary_parts = []
    if passed_nodes:
        summary_parts.append(f"Passed: {', '.join(passed_nodes)}")
    if failed_nodes:
        summary_parts.append(f"Failed: {', '.join(failed_nodes)}")
    if in_progress_nodes:
        summary_parts.append(f"In Progress: {', '.join(in_progress_nodes)}")
    
    summary = f"Interview stopped. Summary: {'; '.join(summary_parts) if summary_parts else 'No questions answered yet.'}"
    
    return {
        "message": summary,
        "session_id": session_id,
    }


@app.get("/ping")
def ping():
    return {"message": "pong"}
