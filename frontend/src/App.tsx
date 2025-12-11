import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import GraphPage from './pages/Graph';
import ChatPage from './pages/Chat';
import SettingsPage from './pages/Settings';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '0.75rem 2rem',
        display: 'flex',
        gap: '1rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}>
        <Link
          to="/graph"
          style={{
            textDecoration: 'none',
            color: '#333',
            fontWeight: '500',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Graph
        </Link>
        <Link
          to="/chat"
          style={{
            textDecoration: 'none',
            color: '#333',
            fontWeight: '500',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Chat
        </Link>
        <Link
          to="/settings"
          style={{
            textDecoration: 'none',
            color: '#333',
            fontWeight: '500',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Settings
        </Link>
      </nav>
      <div style={{ marginTop: '60px' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/graph" replace />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
