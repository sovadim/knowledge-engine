import { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { NodeLevel } from '../types';
import './Chat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<NodeLevel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when interview becomes active
  useEffect(() => {
    if (isInterviewActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInterviewActive]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleStart = async () => {
    if (!selectedLevel) {
      addMessage('assistant', 'Please select a level (A1, A2, or A3) before starting the interview.');
      return;
    }
    try {
      setIsLoading(true);
      setIsInterviewActive(true);
      setMessages([]);
      setSessionId(null);
      const response = await api.startChat(selectedLevel);
      if (response.session_id) {
        setSessionId(response.session_id);
      }
      addMessage('assistant', response.question);
    } catch (error) {
      console.error('Error starting chat:', error);
      addMessage('assistant', 'Failed to start the interview. Please try again.');
      setIsInterviewActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    setSessionId(null);
    setIsInterviewActive(false);
    setMessages([]);
    // Keep the selected level, but allow user to change it
    // The level selector will be shown again since isInterviewActive is false and messages.length is 0
  };

  const handleStop = async () => {
    if (!isInterviewActive && messages.length === 0) {
      addMessage('assistant', 'No active interview to stop.');
      return;
    }
    
    try {
      setIsLoading(true);
      // Backend stub may not require sessionId
      const response = await api.stopChat(sessionId || '');
      addMessage('assistant', response.message);
      setIsInterviewActive(false);
      setSessionId(null);
      
      // Trigger graph refresh after stopping interview
      window.dispatchEvent(new CustomEvent('graph-refresh'));
    } catch (error) {
      console.error('Error stopping chat:', error);
      // Even if API call fails, stop the interview locally
      setIsInterviewActive(false);
      addMessage('assistant', 'Interview stopped.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isInterviewActive) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    try {
      setIsLoading(true);
      // Backend stub may not require sessionId, so we pass it if available
      const response = await api.sendAnswer(userMessage, sessionId || '');
      if (response && response.question) {
        addMessage('assistant', response.question);
        
        // Update session_id if returned
        if (response.session_id) {
          setSessionId(response.session_id);
        }
        
        // Trigger graph refresh by dispatching a custom event
        // The Graph page will listen to this event and refresh
        window.dispatchEvent(new CustomEvent('graph-refresh'));
        
        // If interview is completed, disable input and show restart button
        if (response.completed || response.question.toLowerCase().includes('interview complete') || response.question.toLowerCase().includes('interview finished')) {
          setIsInterviewActive(false);
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error 
        ? `Failed to send your answer: ${error.message}` 
        : 'Failed to send your answer. Please try again.';
      addMessage('assistant', errorMessage);
    } finally {
      setIsLoading(false);
      // Small delay to ensure input is re-enabled before focusing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>Knowledge Assessment Interview</h1>
        <div className="chat-controls">
          {!isInterviewActive && messages.length === 0 && (
            <>
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                alignItems: 'center',
                marginRight: '10px'
              }}>
                <span style={{ fontWeight: '500', color: '#374151' }}>Select Level:</span>
                {[NodeLevel.A1, NodeLevel.A2, NodeLevel.A3].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    disabled={isLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: selectedLevel === level ? '#3b82f6' : '#e5e7eb',
                      color: selectedLevel === level ? 'white' : '#374151',
                      border: `2px solid ${selectedLevel === level ? '#3b82f6' : '#d1d5db'}`,
                      borderRadius: '6px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                    }}
                    title={`Select ${level} level`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <button
                onClick={handleStart}
                disabled={isLoading || !selectedLevel}
                className="btn btn-primary"
                title="Start Interview"
                style={{
                  opacity: !selectedLevel ? 0.5 : 1,
                  cursor: !selectedLevel ? 'not-allowed' : 'pointer',
                }}
              >
                Start Interview
              </button>
            </>
          )}
          {isInterviewActive && (
            <>
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                alignItems: 'center',
                marginRight: '10px'
              }}>
                <span style={{ fontWeight: '500', color: '#374151' }}>Level: {selectedLevel}</span>
              </div>
              <button
                onClick={handleRestart}
                disabled={isLoading}
                className="btn btn-secondary"
                title="Restart Interview"
              >
                Restart Interview
              </button>
              <button
                onClick={handleStop}
                disabled={isLoading}
                className="btn btn-danger"
                title="Stop Interview"
              >
                Stop Interview
              </button>
            </>
          )}
          {!isInterviewActive && messages.length > 0 && (
            <>
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                alignItems: 'center',
                marginRight: '10px'
              }}>
                <span style={{ fontWeight: '500', color: '#374151' }}>Select Level:</span>
                {[NodeLevel.A1, NodeLevel.A2, NodeLevel.A3].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    disabled={isLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: selectedLevel === level ? '#3b82f6' : '#e5e7eb',
                      color: selectedLevel === level ? 'white' : '#374151',
                      border: `2px solid ${selectedLevel === level ? '#3b82f6' : '#d1d5db'}`,
                      borderRadius: '6px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                    }}
                    title={`Select ${level} level`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRestart}
                disabled={isLoading || !selectedLevel}
                className="btn btn-primary"
                title="Restart Interview"
                style={{
                  opacity: !selectedLevel ? 0.5 : 1,
                  cursor: !selectedLevel ? 'not-allowed' : 'pointer',
                }}
              >
                Restart Interview
              </button>
            </>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !isLoading && (
          <div className="chat-welcome">
            <p>Welcome to the Knowledge Assessment Interview!</p>
            <p>Please select your level (A1, A2, or A3) and click "Start Interview" to begin.</p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
          >
            <div className="message-content">
              <div className="message-role">
                {message.role === 'user' ? 'You' : 'AI'}
              </div>
              <div className="message-text" style={{ 
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                minHeight: '1.5em'
              }}>
                {message.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message message-assistant">
            <div className="message-content">
              <div className="message-role">AI</div>
              <div className="message-text">
                <span className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isInterviewActive && (
        <form onSubmit={handleSend} className="chat-input-form">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer here... (Press Enter to send, Shift+Enter for new line)"
            disabled={isLoading}
            className="chat-input"
            rows={3}
            style={{
              minHeight: '60px',
              maxHeight: '150px',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn btn-send"
            style={{
              minWidth: '80px',
            }}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      )}
    </div>
  );
}

export default Chat;

