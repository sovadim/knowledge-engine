import { useState, useRef, useEffect } from 'react';
import { api } from '../api';
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
    try {
      setIsLoading(true);
      setIsInterviewActive(true);
      setMessages([]);
      const response = await api.startChat();
      addMessage('assistant', response.question);
    } catch (error) {
      console.error('Error starting chat:', error);
      addMessage('assistant', 'Failed to start the interview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    await handleStart();
  };

  const handleStop = async () => {
    try {
      setIsLoading(true);
      const response = await api.stopChat();
      addMessage('assistant', response.message);
      setIsInterviewActive(false);
      
      // Trigger graph refresh after stopping interview
      window.dispatchEvent(new CustomEvent('graph-refresh'));
    } catch (error) {
      console.error('Error stopping chat:', error);
      addMessage('assistant', 'Failed to stop the interview.');
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
      const response = await api.sendAnswer(userMessage);
      if (response && response.question) {
        addMessage('assistant', response.question);
        
        // Trigger graph refresh by dispatching a custom event
        // The Graph page will listen to this event and refresh
        window.dispatchEvent(new CustomEvent('graph-refresh'));
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
            <button
              onClick={handleStart}
              disabled={isLoading}
              className="btn btn-primary"
              title="Start Interview"
            >
              Start Interview
            </button>
          )}
          {isInterviewActive && (
            <>
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
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !isLoading && (
          <div className="chat-welcome">
            <p>Welcome to the Knowledge Assessment Interview!</p>
            <p>Click "Start Interview" to begin.</p>
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

