from dto import Node, NodeStatus
from typing import Dict, List, Optional


class Graph:
    def __init__(self):
        self._nodes: Dict[int, Node] = {}
        self._stack: Optional[List[Node]] = []

    def __contains__(self, node_id: int) -> bool:
        return node_id in self._nodes

    def __getitem__(self, key) -> Optional[Node]:
        return self._nodes.get(key)

    def add_node(self, node: Node) -> None:
        """Add a node to the graph."""
        self._nodes[node.id] = node
        # Add node as child to its parents
        for parent_node_id in node.parent_nodes:
            parent_node: Node = self[parent_node_id]
            if node.id not in parent_node.child_nodes:
                parent_node.child_nodes.append(node.id)

    def add_edge(self, from_id: int, to_id: int) -> None:
        src: Node = self[from_id]
        dst: Node = self[to_id]

        if to_id not in src.child_nodes:
            src.child_nodes.append(to_id)

        if from_id not in dst.parent_nodes:
            dst.parent_nodes.append(from_id)

    def delete_edge(self, from_id: int, to_id: int) -> None:
        src: Node = self[from_id]
        dst: Node = self[to_id]

        if to_id in src.child_nodes:
            src.child_nodes.remove(to_id)

        if from_id in dst.parent_nodes:
            dst.parent_nodes.remove(from_id)

    def get_nodes(self) -> List[Node]:
        """Return all nodes in the graph."""
        return list(self._nodes.values())

    def get_node(self, node_id: int) -> Optional[Node]:
        """Return a single node by id."""
        return self._nodes.get(node_id)

    def delete(self, node_id: int) -> None:
        """Delete a node by id."""
        if node_id in self._nodes:
            del self._nodes[node_id]

    def next(self) -> Node:
        # On first node entry
        if self._stack is None:
            root = self._get_root()
            if root is None:
                return None
            root.status = NodeStatus.IN_PROGRESS
            self._stack = [root]
            if root.question is not None:
                return root
            return self.next()

        # If stack is empty, travesal is complete
        if len(self._stack) == 0:
            return None

        # Put child on stack
        node: Node = self._stack[-1]
        for child_id in node.child_nodes:
            child_node: Node = self[child_id]
            if child_node.status == NodeStatus.NOT_REACHED:
                child_node.status = NodeStatus.IN_PROGRESS
                self._stack.append(child_node)
                break

        # If child was added on stack
        if node.id != self._stack[-1].id:
            node = self._stack[-1]
            if node.question is not None:
                return node
            else:
                return self.next()
        else:
            node = self._stack.pop()
            if node.question is not None:
                # If node was passed before
                if node.status != NodeStatus.IN_PROGRESS:
                    return self.next()
                return node
            else:
                node.status = NodeStatus.PASSED
                return self.next()

    def mark_passed(self, id: int) -> None:
        node: Node = self[id]
        node.status = NodeStatus.PASSED

    def mark_failed(self, id: int) -> None:
        node: Node = self[id]
        node.status = NodeStatus.FAILED

    def _get_root(self) -> Node:
        return self.get_node(1) # Assuming root node has id 1

    def reset(self) -> None:
        """Reset the traverstal state of the graph."""
        # Mark nodes as not reached
        for node in self._nodes.values():
            node.status = NodeStatus.NOT_REACHED
        # Reset stack
        self._stack = None
