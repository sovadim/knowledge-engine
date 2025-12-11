import type { Node } from './types';

const API_BASE_URL = 'http://localhost:8000';

export const api = {
  // Nodes
  getNodes: async (): Promise<Node[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/nodes`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch nodes: ${errorText}`);
      }
      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Could not connect to the server. Please make sure the backend is running on http://localhost:8000');
      }
      throw error;
    }
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

  editNode: async (nodeId: number, payload: { level?: string; question?: string; criteria?: string }): Promise<Node> => {
    const response = await fetch(`${API_BASE_URL}/api/nodes/${nodeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to edit node ${nodeId}: ${errorText}`);
    }
    return response.json();
  },

  resetAllNodes: async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/nodes/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        let errorMessage = 'Failed to reset nodes';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage = errorJson.detail;
          }
        } catch {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Could not connect to the server. Please make sure the backend is running on http://localhost:8000');
      }
      throw error;
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
  startChat: async (level: string): Promise<{ question: string; session_id?: string }> => {
    try {
      const url = `${API_BASE_URL}/api/chat/start?level=${encodeURIComponent(level)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        let errorMessage = 'Failed to start chat';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage = errorJson.detail;
          }
        } catch {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }
      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Could not connect to the server. Please make sure the backend is running on http://localhost:8000');
      }
      throw error;
    }
  },

  sendAnswer: async (answer: string, sessionId: string): Promise<{ question: string; session_id?: string; completed?: boolean }> => {
    // FastAPI expects answer as query parameter
    try {
      // Build URL with answer (required) and optional session_id
      let url = `${API_BASE_URL}/api/chat/answer?answer=${encodeURIComponent(answer)}`;
      if (sessionId) {
        url += `&session_id=${encodeURIComponent(sessionId)}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        let errorMessage = 'Failed to send answer';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage = errorJson.detail;
          }
        } catch {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }
      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Could not connect to the server. Please make sure the backend is running on http://localhost:8000');
      }
      throw error;
    }
  },

  stopChat: async (sessionId: string): Promise<{ message: string; session_id?: string }> => {
    try {
      const url = sessionId
        ? `${API_BASE_URL}/api/chat/stop?session_id=${encodeURIComponent(sessionId)}`
        : `${API_BASE_URL}/api/chat/stop`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        let errorMessage = 'Failed to stop chat';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage = errorJson.detail;
          }
        } catch {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }
      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Could not connect to the server. Please make sure the backend is running on http://localhost:8000');
      }
      throw error;
    }
  },
};

