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
      width: '100vw',
      height: 'calc(100vh - 60px)',
      backgroundColor: '#f9fafb',
      margin: 0,
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '600px',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        margin: '0 2rem',
      }}>
        <h1 style={{ 
          marginBottom: '2rem', 
          color: '#333',
          fontSize: '1.5rem',
          fontWeight: '500',
        }}>
          Settings
        </h1>
        
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label 
              htmlFor="api-key"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333',
                fontSize: '0.875rem',
              }}
            >
              Enter your API key:
            </label>
            <input
              id="api-key"
              type="text"
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
                border: '1px solid #d0d0d0',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                fontFamily: 'monospace',
                backgroundColor: '#fff',
                outline: 'none',
                transition: 'border-color 0.2s',
                color: '#333',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d0d0d0';
                e.currentTarget.style.boxShadow = 'none';
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
                fontSize: '0.875rem',
              }}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !apiKey.trim()}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: isLoading || !apiKey.trim() ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: isLoading || !apiKey.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isLoading && apiKey.trim()) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && apiKey.trim()) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Settings;

