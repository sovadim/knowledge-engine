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

// Simple layout algorithm - arrange nodes in a hierarchical layout
const convertToReactFlowNodes = (backendNodes: BackendNode[]): Node[] => {
  // Find root nodes (nodes with no parents)
  const rootNodes = backendNodes.filter(node => node.parent_nodes.length === 0);
  
  // Create a map for quick lookup
  const nodeMap = new Map(backendNodes.map(node => [node.id, node]));
  
  // Calculate positions using a simple hierarchical layout
  const positions = new Map<number, { x: number; y: number }>();
  const visited = new Set<number>();
  
  const layoutNode = (nodeId: number, level: number, index: number) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    const x = level * 250 + 100;
    const y = index * 120 + 100;
    positions.set(nodeId, { x, y });
    
    // Layout children
    node.child_nodes.forEach((childId, childIndex) => {
      layoutNode(childId, level + 1, index * 2 + childIndex);
    });
  };
  
  // Layout all root nodes
  rootNodes.forEach((rootNode, index) => {
    layoutNode(rootNode.id, 0, index);
  });
  
  // Handle orphaned nodes (nodes not connected to any root)
  backendNodes.forEach((node, index) => {
    if (!visited.has(node.id)) {
      positions.set(node.id, {
        x: (backendNodes.length + index) % 5 * 200 + 100,
        y: Math.floor((backendNodes.length + index) / 5) * 150 + 100,
      });
    }
  });
  
  return backendNodes.map((backendNode) => {
    const pos = positions.get(backendNode.id) || { x: 100, y: 100 };
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
  backendNodes.forEach((backendNode) => {
    backendNode.child_nodes.forEach((childId) => {
      edges.push({
        id: `e${backendNode.id}-${childId}`,
        source: backendNode.id.toString(),
        target: childId.toString(),
        type: 'smoothstep',
        animated: backendNode.status === NodeStatus.IN_PROGRESS,
      });
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
      setError(err instanceof Error ? err.message : 'Failed to load nodes');
      console.error('Error loading nodes:', err);
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
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <p style={{ color: 'red', fontSize: '18px', marginBottom: '10px' }}>Error: {error}</p>
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
    <div style={{ width: '100vw', height: 'calc(100vh - 60px)', position: 'relative', backgroundColor: '#f9fafb' }}>
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
        <MiniMap />
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

