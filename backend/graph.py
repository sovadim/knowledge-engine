from dto import Node, NodeStatus
from typing import Dict, List, Optional


class Graph:
    def __init__(self):
        self.nodes: Dict[int, Node] = {}

    def __contains__(self, node_id: int) -> bool:
        return node_id in self.nodes

    def __getitem__(self, key) -> Optional[Node]:
        return self.nodes.get(key)

    def add_node(self, node: Node) -> None:
        """Add a node to the graph."""
        self.nodes[node.id] = node

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
        return list(self.nodes.values())
    
    def get_node(self, node_id: int) -> Optional[Node]:
        """Return a single node by id."""
        return self.nodes.get(node_id)

    def delete(self, node_id: int) -> None:
        """Delete a node by id."""
        if node_id in self.nodes:
            del self.nodes[node_id]

    def reset_status(self) -> None:
        """Reset the status of all nodes to NOT_REACHED."""
        for node in self.nodes.values():
            node.status = NodeStatus.NOT_REACHED
