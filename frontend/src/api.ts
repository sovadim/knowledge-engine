import type { Node } from './types';

const API_BASE_URL = 'http://localhost:8000';

export const api = {
  // Nodes
  getNodes: async (): Promise<Node[]> => {
    const response = await fetch(`${API_BASE_URL}/api/nodes`);
    if (!response.ok) {
      throw new Error('Failed to fetch nodes');
    }
    return response.json();
  },

  getNode: async (nodeId: number): Promise<Node> => {
    const response = await fetch(`${API_BASE_URL}/api/nodes/${nodeId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch node ${nodeId}`);
    }
    return response.json();
  },

  createNode: async (node: Node): Promise<Node> => {
    const response = await fetch(`${API_BASE_URL}/api/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(node),
    });
    if (!response.ok) {
      throw new Error('Failed to create node');
    }
    return response.json();
  },

  deleteNode: async (nodeId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/nodes/${nodeId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete node ${nodeId}`);
    }
  },

  disableNode: async (nodeId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/nodes/${nodeId}/disable`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to disable node ${nodeId}`);
    }
  },

  enableNode: async (nodeId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/nodes/${nodeId}/enable`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to enable node ${nodeId}`);
    }
  },

  // Edges
  createEdge: async (fromId: number, toId: number): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/api/edge?from=${fromId}&to=${toId}`,
      {
        method: 'POST',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to create edge');
    }
  },

  deleteEdge: async (fromId: number, toId: number): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/api/edge?from=${fromId}&to=${toId}`,
      {
        method: 'DELETE',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete edge');
    }
  },

  // Chat
  startChat: async (): Promise<{ question: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/chat/start`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to start chat');
    }
    return response.json();
  },

  sendAnswer: async (answer: string): Promise<{ question: string }> => {
    // FastAPI expects answer as a query parameter
    const response = await fetch(
      `${API_BASE_URL}/api/chat/answer?answer=${encodeURIComponent(answer)}`,
      {
        method: 'POST',
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error('Failed to send answer');
    }
    return response.json();
  },

  stopChat: async (): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/chat/stop`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to stop chat');
    }
    return response.json();
  },
};

