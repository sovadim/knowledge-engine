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

// Simple layout algorithm - arrange nodes in a hierarchical layout (top-down)
const convertToReactFlowNodes = (backendNodes: BackendNode[]): Node[] => {
  // Find root nodes (nodes with no parents)
  const rootNodes = backendNodes.filter(node => node.parent_nodes.length === 0);
  
  // Create a map for quick lookup
  const nodeMap = new Map(backendNodes.map(node => [node.id, node]));
  
  // Calculate positions using a top-down hierarchical layout
  const positions = new Map<number, { x: number; y: number }>();
  const visited = new Set<number>();
  const levelNodes = new Map<number, number[]>(); // Track nodes at each level
  
  // Build a map of all children for each node (including from parent_nodes relationships)
  const allChildrenMap = new Map<number, number[]>();
  backendNodes.forEach((node) => {
    const children = new Set(node.child_nodes);
    // Also add nodes that have this node as parent
    backendNodes.forEach((n) => {
      if (n.parent_nodes.includes(node.id)) {
        children.add(n.id);
      }
    });
    allChildrenMap.set(node.id, Array.from(children));
  });
  
  // Calculate positions for nodes at each level
  const layoutNode = (nodeId: number, level: number, siblingIndex: number, totalSiblings: number) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    // Top-down layout: Y increases with depth, X for horizontal spacing
    const horizontalSpacing = 300;
    const verticalSpacing = 250;
    
    // Calculate x position - center siblings horizontally
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const totalWidth = Math.max(0, (totalSiblings - 1) * horizontalSpacing);
    const startX = (screenWidth - totalWidth) / 2;
    const x = startX + siblingIndex * horizontalSpacing;
    
    // Calculate y position based on level (vertical growth from top)
    // Start from top (y=100) and increase downward
    const y = level * verticalSpacing + 100;
    
    positions.set(nodeId, { x, y });
    
    // Track nodes at this level
    if (!levelNodes.has(level)) {
      levelNodes.set(level, []);
    }
    levelNodes.get(level)!.push(nodeId);
    
    // Get all children (from the map we built)
    const allChildren = allChildrenMap.get(nodeId) || [];
    
    // Layout children
    allChildren.forEach((childId, childIndex) => {
      layoutNode(childId, level + 1, childIndex, allChildren.length);
    });
  };
  
  // Layout all root nodes
  rootNodes.forEach((rootNode, index) => {
    layoutNode(rootNode.id, 0, index, rootNodes.length);
  });
  
  // Handle any remaining unvisited nodes (shouldn't happen, but just in case)
  backendNodes.forEach((node) => {
    if (!visited.has(node.id)) {
      const maxLevel = levelNodes.size > 0 ? Math.max(...Array.from(levelNodes.keys())) : 0;
      const siblingsAtLevel = Array.from(levelNodes.get(maxLevel + 1) || []).length;
      positions.set(node.id, {
        x: 200 + siblingsAtLevel * 300,
        y: (maxLevel + 1) * 250 + 100,
      });
      if (!levelNodes.has(maxLevel + 1)) {
        levelNodes.set(maxLevel + 1, []);
      }
      levelNodes.get(maxLevel + 1)!.push(node.id);
    }
  });
  
  // Center nodes at each level horizontally
  const centeredPositions = new Map<number, { x: number; y: number }>();
  
  levelNodes.forEach((nodeIds, level) => {
    if (nodeIds.length === 0) return;
    
    // Calculate total width needed for this level
    const nodePositions = nodeIds.map(id => positions.get(id)!);
    const minX = Math.min(...nodePositions.map(p => p.x));
    const maxX = Math.max(...nodePositions.map(p => p.x));
    const levelWidth = maxX - minX;
    
    // Center the level
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const centerX = screenWidth / 2;
    const offsetX = centerX - (minX + levelWidth / 2);
    
    // Apply offset to all nodes at this level
    nodeIds.forEach((nodeId) => {
      const originalPos = positions.get(nodeId)!;
      centeredPositions.set(nodeId, {
        x: originalPos.x + offsetX,
        y: originalPos.y,
      });
    });
  });
  
  // Use centered positions if available, otherwise use original positions
  return backendNodes.map((backendNode) => {
    const pos = centeredPositions.get(backendNode.id) || positions.get(backendNode.id) || { x: 200, y: 100 };
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
  const [contextMenu, setContextMenu] = useState<{
    nodeId: number | null;
    edgeId: string | null;
    x: number;
    y: number;
  } | null>(null);
  const [newNodeData, setNewNodeData] = useState({
    name: '',
    level: NodeLevel.A1,
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
      };

      await api.createNode(newNode);
      setShowCreateNodeDialog(false);
      setNewNodeData({ name: '', level: NodeLevel.A1 });
      await loadNodes();
    } catch (err) {
      console.error('Error creating node:', err);
      alert('Failed to create node');
    }
  }, [newNodeData, nodes, loadNodes]);

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
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            minWidth: '300px',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Create New Node</h3>
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
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowCreateNodeDialog(false);
                setNewNodeData({ name: '', level: NodeLevel.A1 });
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
            zIndex: 1000,
            minWidth: '150px',
          }}
        >
          {contextMenu.nodeId !== null && (
            <>
              <button
                onClick={async () => {
                  const node = nodes.find(n => parseInt(n.id) === contextMenu.nodeId);
                  if (node) {
                    await handleToggleNodeStatus(
                      contextMenu.nodeId!,
                      !node.data.disabled
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
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {nodes.find(n => parseInt(n.id) === contextMenu.nodeId)?.data.disabled
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

