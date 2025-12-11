import { useState } from 'react';
import { api } from '../api';

function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);
      await api.saveApiKey(apiKey.trim());
      setMessage({ type: 'success', text: 'API key saved successfully!' });
      // Optionally clear the field after successful save
      // setApiKey('');
    } catch (error) {
      console.error('Error saving API key:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save API key. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <h1 style={{ marginBottom: '2rem', color: '#1f2937' }}>Settings</h1>
      
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label 
            htmlFor="api-key"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#374151',
              fontSize: '14px',
            }}
          >
            Enter your API key:
          </label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setMessage(null); // Clear message when user types
            }}
            placeholder="Enter your API key"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'monospace',
              backgroundColor: '#fff',
            }}
          />
        </div>

        {message && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
              color: message.type === 'success' ? '#065f46' : '#991b1b',
              fontSize: '14px',
            }}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !apiKey.trim()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: isLoading || !apiKey.trim() ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isLoading || !apiKey.trim() ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}

export default Settings;

