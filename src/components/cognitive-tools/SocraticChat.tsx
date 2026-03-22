import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import styles from './SocraticChat.module.css';

export interface SocraticMessage {
  role: 'ai' | 'student';
  content: string;
}

export interface TelemetryEvent {
  event: 'response_time' | 'paste_attempt';
  duration?: number;
  timestamp: number;
}

export interface SocraticChatProps {
  messages: SocraticMessage[];
  onSendMessage: (message: string) => void;
  onTelemetryUpdate: (event: TelemetryEvent) => void;
  isLoading: boolean;
}

export const SocraticChat: React.FC<SocraticChatProps> = ({
  messages,
  onSendMessage,
  onTelemetryUpdate,
  isLoading,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Telemetry: Time-to-Action tracking
  const aiReadyTimeRef = useRef<number | null>(null);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Track when the AI finishes loading to start the "Time-to-Action" timer
  useEffect(() => {
    if (!isLoading) {
      // AI just finished replying, record the time
      aiReadyTimeRef.current = Date.now();
    } else {
      // AI is typing, reset timer
      aiReadyTimeRef.current = null;
    }
  }, [isLoading]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;

    // Calculate Time-to-Action
    if (aiReadyTimeRef.current !== null) {
      const timeToAction = Date.now() - aiReadyTimeRef.current;
      onTelemetryUpdate({
        event: 'response_time',
        duration: timeToAction,
        timestamp: Date.now()
      });
    }

    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    onTelemetryUpdate({
      event: 'paste_attempt',
      timestamp: Date.now()
    });
    // Silent failure per Architecture of Silence
  };

  // Adjust textarea height automatically
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.messagesArea}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`${styles.messageWrapper} ${
              msg.role === 'student' ? styles.messageWrapperStudent : styles.messageWrapperAi
            }`}
          >
            <div
              className={`${styles.messageBubble} ${
                msg.role === 'student' ? styles.messageBubbleStudent : styles.messageBubbleAi
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className={`${styles.messageWrapper} ${styles.messageWrapperAi}`}>
            <div className={`${styles.messageBubble} ${styles.messageBubbleAi}`}>
              <div className={styles.loadingIndicator}>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <textarea
          className={styles.textarea}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type your reasoning..."
          disabled={isLoading}
          rows={1}
        />
        <button 
          className={styles.sendButton}
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
          aria-label="Send message"
        >
          {/* Minimalist send icon (Lucide equivalent inline SVG for self-containment) */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
};
