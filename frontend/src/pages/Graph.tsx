import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import type { Node, Edge, Connection, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../api';
import type { Node as BackendNode } from '../types';
import { NodeStatus, NodeLevel } from '../types';
import CustomNode from '../components/CustomNode';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
} as NodeTypes;

// FitViewButton component that uses useReactFlow hook inside ReactFlow
function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <button
      onClick={() => fitView({ padding: 0.2 })}
      style={{
        padding: '10px 20px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
      }}
    >
      Fit View
    </button>
  );
}

// Improved hierarchical layout algorithm - prevents overlaps and handles complex relationships
const convertToReactFlowNodes = (backendNodes: BackendNode[]): Node[] => {
  // Create a map for quick lookup
  const nodeMap = new Map(backendNodes.map(node => [node.id, node]));

  // Build relationship maps
  const childrenMap = new Map<number, number[]>();
  const parentsMap = new Map<number, number[]>();
  
  backendNodes.forEach((node) => {
    // Build children map (from child_nodes and parent_nodes relationships)
    const children = new Set(node.child_nodes);
    backendNodes.forEach((n) => {
      if (n.parent_nodes.includes(node.id)) {
        children.add(n.id);
      }
    });
    childrenMap.set(node.id, Array.from(children));
    
    // Build parents map
    parentsMap.set(node.id, node.parent_nodes);
  });

  // Calculate level (distance from root) for each node
  const nodeLevels = new Map<number, number>();
  const calculateLevel = (nodeId: number): number => {
    if (nodeLevels.has(nodeId)) {
      return nodeLevels.get(nodeId)!;
    }
    
    const parents = parentsMap.get(nodeId) || [];
    if (parents.length === 0) {
      nodeLevels.set(nodeId, 0);
      return 0;
    }
    
    // For nodes with multiple parents, use the minimum level + 1
    const parentLevels = parents.map(p => calculateLevel(p));
    const level = Math.min(...parentLevels) + 1;
    nodeLevels.set(nodeId, level);
    return level;
  };

  // Calculate levels for all nodes
  backendNodes.forEach(node => {
    calculateLevel(node.id);
  });

  // Group nodes by level
  const nodesByLevel = new Map<number, number[]>();
  backendNodes.forEach(node => {
    const level = nodeLevels.get(node.id) || 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node.id);
  });

  // Node dimensions (from CustomNode: minWidth 150, minHeight 80)
  const NODE_WIDTH = 180;
  const NODE_HEIGHT = 100;
  const HORIZONTAL_SPACING = 250; // Space between nodes horizontally
  const VERTICAL_SPACING = 200; // Space between levels vertically
  const START_Y = 100;

  // Calculate positions for each level
  const positions = new Map<number, { x: number; y: number }>();
  
  // Sort levels
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
  
  sortedLevels.forEach((level) => {
    const nodeIds = nodesByLevel.get(level)!;
    const y = level * VERTICAL_SPACING + START_Y;
    
    // Calculate total width needed for this level
    const totalWidth = (nodeIds.length - 1) * HORIZONTAL_SPACING + NODE_WIDTH;
    
    // Center the level horizontally
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1400;
    const startX = (screenWidth - totalWidth) / 2;
    
    // Position nodes at this level
    nodeIds.forEach((nodeId, index) => {
      const x = startX + index * HORIZONTAL_SPACING;
      positions.set(nodeId, { x, y });
    });
  });

  // For nodes with multiple parents, try to position them between their parents
  // This helps with edge visualization
  const adjustPositionsForMultipleParents = () => {
    backendNodes.forEach(node => {
      const parents = parentsMap.get(node.id) || [];
      if (parents.length > 1) {
        // Get parent positions
        const parentPositions = parents
          .map(p => positions.get(p))
          .filter(p => p !== undefined) as { x: number; y: number }[];
        
        if (parentPositions.length > 0) {
          // Calculate average x position of parents
          const avgX = parentPositions.reduce((sum, p) => sum + p.x, 0) / parentPositions.length;
          const level = nodeLevels.get(node.id) || 0;
          const y = level * VERTICAL_SPACING + START_Y;
          
          // Check if this position would overlap with other nodes at this level
          const nodeIdsAtLevel = nodesByLevel.get(level) || [];
          const existingPositions = nodeIdsAtLevel
            .map(id => positions.get(id))
            .filter(p => p !== undefined) as { x: number; y: number }[];
          
          // Find a non-overlapping position near the average
          let bestX = avgX;
          let minDistance = Infinity;
          
          // Try positions around the average
          for (let offset = -HORIZONTAL_SPACING; offset <= HORIZONTAL_SPACING; offset += 50) {
            const testX = avgX + offset;
            const conflicts = existingPositions.filter(p => 
              Math.abs(p.x - testX) < HORIZONTAL_SPACING && p.y === y
            );
            
            if (conflicts.length === 0) {
              bestX = testX;
              break;
            } else {
              const distance = Math.abs(offset);
              if (distance < minDistance) {
                minDistance = distance;
                bestX = testX;
              }
            }
          }
          
          positions.set(node.id, { x: bestX, y });
        }
      }
    });
  };

  adjustPositionsForMultipleParents();

  // Final pass: ensure no overlaps by adjusting positions at each level
  const finalPositions = new Map<number, { x: number; y: number }>();
  sortedLevels.forEach((level) => {
    const nodeIds = nodesByLevel.get(level) || [];
    const sortedNodeIds = [...nodeIds].sort((a, b) => {
      const posA = positions.get(a) || { x: 0, y: 0 };
      const posB = positions.get(b) || { x: 0, y: 0 };
      return posA.x - posB.x;
    });
    
    const levelPositions: { x: number; y: number }[] = [];
    
    sortedNodeIds.forEach((nodeId) => {
      const originalPos = positions.get(nodeId);
      if (originalPos) {
        let x = originalPos.x;
        
        // Check for overlaps with already positioned nodes at this level
        for (const existingPos of levelPositions) {
          if (Math.abs(x - existingPos.x) < HORIZONTAL_SPACING) {
            x = existingPos.x + HORIZONTAL_SPACING;
          }
        }
        
        const finalPos = { x, y: originalPos.y };
        levelPositions.push(finalPos);
        finalPositions.set(nodeId, finalPos);
      }
    });
  });

  // Use final positions
  return backendNodes.map((backendNode) => {
    const pos = finalPositions.get(backendNode.id) || positions.get(backendNode.id) || { x: 200, y: 100 };
    return {
      id: backendNode.id.toString(),
      type: 'custom',
      position: pos,
      data: {
        label: backendNode.name,
        status: backendNode.status,
        level: backendNode.level,
        nodeId: backendNode.id,
        disabled: backendNode.status === NodeStatus.DISABLED,
      },
    };
  });
};

// Convert backend nodes to React Flow edges
const convertToReactFlowEdges = (backendNodes: BackendNode[]): Edge[] => {
  const edges: Edge[] = [];
  const edgeSet = new Set<string>(); // Track edges to avoid duplicates

  backendNodes.forEach((backendNode) => {
    // Create edges from child_nodes (parent -> child)
    backendNode.child_nodes.forEach((childId) => {
      const edgeId = `e${backendNode.id}-${childId}`;
      if (!edgeSet.has(edgeId)) {
      edges.push({
          id: edgeId,
        source: backendNode.id.toString(),
        target: childId.toString(),
        type: 'smoothstep',
        animated: backendNode.status === NodeStatus.IN_PROGRESS,
      });
        edgeSet.add(edgeId);
      }
    });

    // Also create edges from parent_nodes (ensures all relationships are shown)
    // This handles cases where a node has a parent but parent doesn't list it in child_nodes
    backendNode.parent_nodes.forEach((parentId) => {
      const edgeId = `e${parentId}-${backendNode.id}`;
      if (!edgeSet.has(edgeId)) {
        edges.push({
          id: edgeId,
          source: parentId.toString(),
          target: backendNode.id.toString(),
          type: 'smoothstep',
          animated: backendNode.status === NodeStatus.IN_PROGRESS,
        });
        edgeSet.add(edgeId);
      }
    });
  });

  return edges;
};

function Graph() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateNodeDialog, setShowCreateNodeDialog] = useState(false);
  const [showEditNodeDialog, setShowEditNodeDialog] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    nodeId: number | null;
    edgeId: string | null;
    x: number;
    y: number;
  } | null>(null);
  const [newNodeData, setNewNodeData] = useState({
    name: '',
    level: NodeLevel.A1,
    question: '',
    criteria: ''
  });

  // Load nodes from backend
  const loadNodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const backendNodes = await api.getNodes();
      console.log('Loaded nodes from backend:', backendNodes);
      const reactFlowNodes = convertToReactFlowNodes(backendNodes);
      const reactFlowEdges = convertToReactFlowEdges(backendNodes);
      console.log('React Flow nodes:', reactFlowNodes);
      console.log('React Flow edges:', reactFlowEdges);
      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load nodes';
      setError(errorMessage);
      console.error('Error loading nodes:', err);
      // If it's a network error, provide helpful message
      if (errorMessage.includes('Network error') || errorMessage.includes('fetch')) {
        console.error('Backend connection issue. Please ensure:');
        console.error('1. Backend is running on http://localhost:8000');
        console.error('2. CORS is configured in the backend');
        console.error('3. No firewall is blocking the connection');
      }
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  // Listen for graph refresh events from Chat page
  useEffect(() => {
    const handleRefresh = () => {
      loadNodes();
    };

    window.addEventListener('graph-refresh', handleRefresh);
    return () => {
      window.removeEventListener('graph-refresh', handleRefresh);
    };
  }, [loadNodes]);

  // Handle edge creation
  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return;

      // Prevent connecting disabled nodes
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      if (sourceNode?.data.disabled || targetNode?.data.disabled) {
        alert('Cannot connect disabled nodes');
        return;
      }

      try {
        const sourceId = parseInt(params.source);
        const targetId = parseInt(params.target);
        await api.createEdge(sourceId, targetId);

        // Reload nodes to get updated edges
        await loadNodes();
      } catch (err) {
        console.error('Error creating edge:', err);
        alert('Failed to create edge. Make sure both nodes exist.');
      }
    },
    [loadNodes, nodes]
  );

  // Handle node creation
  const handleCreateNode = useCallback(async () => {
    if (!newNodeData.name.trim()) {
      alert('Please enter a node name');
      return;
    }

    try {
      // Generate a new ID (in a real app, the backend should handle this)
      const maxId = nodes.length > 0
        ? Math.max(...nodes.map(n => parseInt(n.id)))
        : 0;
      const newId = maxId + 1;

      const newNode: BackendNode = {
        id: newId,
        name: newNodeData.name,
        status: NodeStatus.NOT_REACHED,
        level: newNodeData.level,
        child_nodes: [],
        parent_nodes: [],
        question: newNodeData.question.trim() || undefined,
        criteria: newNodeData.criteria.trim() || undefined
      };

      await api.createNode(newNode);
      setShowCreateNodeDialog(false);
      setNewNodeData({ name: '', level: NodeLevel.A1, question: '', criteria: ''});
      await loadNodes();
    } catch (err) {
      console.error('Error creating node:', err);
      alert('Failed to create node');
    }
  }, [newNodeData, nodes, loadNodes]);

  // Handle node editing
  const handleEditNode = useCallback(async () => {
    if (!editingNodeId || !newNodeData.name.trim()) {
      alert('Please enter a node name');
      return;
    }

    try {
      // Get the existing node to preserve relationships
      const existingNode = await api.getNode(editingNodeId);

      const updatedNode: BackendNode = {
        ...existingNode,
        name: newNodeData.name,
        level: newNodeData.level,
        question: newNodeData.question.trim() || undefined,
        criteria: newNodeData.criteria.trim() || undefined,
      };

      // Use createNode API which also works for updates (backend overwrites by id)
      await api.createNode(updatedNode);
      setShowEditNodeDialog(false);
      setEditingNodeId(null);
      setNewNodeData({ name: '', level: NodeLevel.A1, question: '', criteria: '' });
      await loadNodes();
    } catch (err) {
      console.error('Error editing node:', err);
      alert('Failed to edit node');
    }
  }, [editingNodeId, newNodeData, loadNodes]);

  // Open edit dialog
  const handleOpenEditDialog = useCallback(async (nodeId: number) => {
    try {
      const node = await api.getNode(nodeId);
      setEditingNodeId(nodeId);
      setNewNodeData({
        name: node.name,
        level: node.level,
        question: node.question || '',
        criteria: node.criteria || '',
      });
      setShowEditNodeDialog(true);
      setContextMenu(null);
    } catch (err) {
      console.error('Error loading node for editing:', err);
      alert('Failed to load node data');
    }
  }, []);

  // Handle node deletion
  const handleDeleteNode = useCallback(async (nodeId: number) => {
    if (!confirm('Are you sure you want to delete this node?')) {
      return;
    }

    try {
      await api.deleteNode(nodeId);
      await loadNodes();
    } catch (err) {
      console.error('Error deleting node:', err);
      alert('Failed to delete node');
    }
  }, [loadNodes]);

  // Handle enable/disable node
  const handleToggleNodeStatus = useCallback(
    async (nodeId: number, isDisabled: boolean) => {
      try {
        // If node is currently disabled, enable it. Otherwise, disable it.
        if (isDisabled) {
          await api.enableNode(nodeId);
        } else {
          await api.disableNode(nodeId);
        }
        await loadNodes();
      } catch (err) {
        console.error('Error toggling node status:', err);
        alert('Failed to toggle node status');
      }
    },
    [loadNodes]
  );

  // Handle edge deletion
  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      const edge = edges.find(e => e.id === edgeId);
      if (!edge) return;

      try {
        const sourceId = parseInt(edge.source);
        const targetId = parseInt(edge.target);
        await api.deleteEdge(sourceId, targetId);
        await loadNodes();
        setContextMenu(null);
      } catch (err) {
        console.error('Error deleting edge:', err);
        alert('Failed to delete edge');
      }
    },
    [loadNodes, edges]
  );

  // Handle node context menu
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const nodeId = parseInt(node.id);
      setContextMenu({
        nodeId,
        edgeId: null,
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  // Handle edge context menu
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        nodeId: null,
        edgeId: edge.id,
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  // Handle pane click to close context menu
  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter(n => n.selected);
        const selectedEdges = edges.filter(e => e.selected);

        if (selectedNodes.length > 0) {
          selectedNodes.forEach(node => {
            const nodeId = parseInt(node.id);
            handleDeleteNode(nodeId);
          });
        } else if (selectedEdges.length > 0) {
          selectedEdges.forEach(edge => {
            handleDeleteEdge(edge.id);
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, handleDeleteNode, handleDeleteEdge]);

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div>
          <p style={{ fontSize: '18px' }}>Loading graph...</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>Fetching nodes from backend...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        width: '100vw',
        height: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <p style={{ color: 'red', fontSize: '18px', marginBottom: '10px', maxWidth: '600px' }}>
          Error: {error}
        </p>
        {error.includes('Network error') && (
          <div style={{ marginBottom: '20px', color: '#666', fontSize: '14px', maxWidth: '500px' }}>
            <p>Please check:</p>
            <ul style={{ textAlign: 'left', display: 'inline-block' }}>
              <li>Backend is running on http://localhost:8000</li>
              <li>Backend has CORS middleware configured</li>
              <li>No firewall is blocking the connection</li>
              <li>Try refreshing the page or restarting the frontend dev server</li>
            </ul>
      </div>
        )}
        <button
          onClick={loadNodes}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: 'calc(100vh - 60px)', position: 'relative', backgroundColor: '#f9fafb', margin: 0, padding: 0, overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
        deleteKeyCode={['Delete', 'Backspace']}
        style={{ width: '100%', height: '100%' }}
      >
        <Panel position="top-left" style={{ display: 'flex', gap: '10px', margin: '10px' }}>
          <button
            onClick={() => setShowCreateNodeDialog(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
          }}
        >
          Create Node
        </button>
        <button
          onClick={loadNodes}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
              fontWeight: '500',
          }}
        >
          Refresh
        </button>
          <FitViewButton />
        </Panel>
        <Background />
        <Controls />
        <MiniMap
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            width: 200,
            height: 150,
          }}
        />
      </ReactFlow>

      {showCreateNodeDialog && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
            }}
            onClick={() => {
              setShowCreateNodeDialog(false);
              setNewNodeData({ name: '', level: NodeLevel.A1, question: '', criteria: '' });
            }}
          />
          {/* Dialog */}
          <div
            style={{
              position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
              zIndex: 10000,
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              minWidth: '400px',
              maxWidth: '600px',
              maxHeight: '85vh',
              overflowY: 'auto',
          }}
            onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ marginTop: 0, color: '#1f2937' }}>Create New Node</h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Node Name:
            </label>
            <input
              type="text"
              value={newNodeData.name}
              onChange={(e) =>
                setNewNodeData({ ...newNodeData, name: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
              placeholder="Enter node name"
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Level:
            </label>
            <select
              value={newNodeData.level}
              onChange={(e) =>
                setNewNodeData({
                  ...newNodeData,
                  level: e.target.value as NodeLevel,
                })
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            >
              <option value={NodeLevel.A1}>A1</option>
              <option value={NodeLevel.A2}>A2</option>
              <option value={NodeLevel.A3}>A3</option>
            </select>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Question (optional):
            </label>
            <textarea
              value={newNodeData.question}
              onChange={(e) =>
                setNewNodeData({ ...newNodeData, question: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minHeight: '80px',
                resize: 'vertical',
              }}
              placeholder="Enter question for this node"
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Criteria A1 (optional):
            </label>
            <textarea
              value={newNodeData.criteria}
              onChange={(e) =>
                setNewNodeData({ ...newNodeData, criteria: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minHeight: '60px',
                resize: 'vertical',
              }}
              placeholder="Enter evaluation criteria"
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowCreateNodeDialog(false);
                setNewNodeData({ name: '', level: NodeLevel.A1, question: '', criteria: '' });
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateNode}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Create
            </button>
          </div>
        </div>
        </>
      )}

      {/* Edit Node Dialog */}
      {showEditNodeDialog && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
            }}
            onClick={() => {
              setShowEditNodeDialog(false);
              setEditingNodeId(null);
              setNewNodeData({ name: '', level: NodeLevel.A1, question: '', criteria: '' });
            }}
          />
          {/* Dialog */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10000,
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              minWidth: '400px',
              maxWidth: '600px',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <h3 style={{ marginTop: 0, color: '#1f2937'}}>Edit Node</h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Node Name:
            </label>
            <input
              type="text"
              value={newNodeData.name}
              onChange={(e) =>
                setNewNodeData({ ...newNodeData, name: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
              placeholder="Enter node name"
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Level:
            </label>
            <select
              value={newNodeData.level}
              onChange={(e) =>
                setNewNodeData({
                  ...newNodeData,
                  level: e.target.value as NodeLevel,
                })
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            >
              <option value={NodeLevel.A1}>A1</option>
              <option value={NodeLevel.A2}>A2</option>
              <option value={NodeLevel.A3}>A3</option>
            </select>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Question (optional):
            </label>
            <textarea
              value={newNodeData.question}
              onChange={(e) =>
                setNewNodeData({ ...newNodeData, question: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minHeight: '80px',
                resize: 'vertical',
              }}
              placeholder="Enter question for this node"
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Criteria A1 (optional):
            </label>
            <textarea
              value={newNodeData.criteria}
              onChange={(e) =>
                setNewNodeData({ ...newNodeData, criteria: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minHeight: '60px',
                resize: 'vertical',
              }}
              placeholder="Enter evaluation criteria"
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowEditNodeDialog(false);
                setEditingNodeId(null);
                setNewNodeData({ name: '', level: NodeLevel.A1, question: '', criteria: '' });
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleEditNode}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>
        </>
      )}


      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 10001,
            minWidth: '150px',
          }}
        >
          {contextMenu.nodeId !== null && (
            <>
              <button
                onClick={async () => {
                  await handleOpenEditDialog(contextMenu.nodeId!);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  textAlign: 'left',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#1f2937',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Edit Node
              </button>
              <button
                onClick={async () => {
                  const node = nodes.find(n => parseInt(n.id) === contextMenu.nodeId);
                  if (node && node.data) {
                    const isCurrentlyDisabled = node.data.disabled === true;
                    await handleToggleNodeStatus(
                      contextMenu.nodeId!,
                      isCurrentlyDisabled
                    );
                  }
                  setContextMenu(null);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  textAlign: 'left',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#1f2937',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {nodes.find(n => parseInt(n.id) === contextMenu.nodeId)?.data?.disabled === true
                  ? 'Enable Node'
                  : 'Disable Node'}
              </button>
              <button
                onClick={async () => {
                  await handleDeleteNode(contextMenu.nodeId!);
                  setContextMenu(null);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  textAlign: 'left',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#ef4444',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Delete Node
              </button>
            </>
          )}
          {contextMenu.edgeId !== null && (
            <button
              onClick={async () => {
                await handleDeleteEdge(contextMenu.edgeId!);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#ef4444',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Delete Edge
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function GraphPage() {
  console.log('GraphPage component rendering');
  return (
    <ReactFlowProvider>
      <Graph />
    </ReactFlowProvider>
  );
}

