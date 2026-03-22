import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './TerminalCanvas.module.css';

export interface TelemetryEvent {
  event: 'tab_switch' | 'pause_detected' | 'paste_attempt';
  duration?: number;
  timestamp: number;
}

export interface TerminalCanvasProps {
  value: string;
  onChange: (newValue: string) => void;
  onTelemetryUpdate: (event: TelemetryEvent) => void;
  placeholder?: string;
  title?: string;
}

const PAUSE_THRESHOLD_MS = 2000;

export const TerminalCanvas: React.FC<TerminalCanvasProps> = ({
  value,
  onChange,
  onTelemetryUpdate,
  placeholder = 'Awaiting input...',
  title = 'TERMINAL_CANVAS',
}) => {
  const [isTyping, setIsTyping] = useState(false);
  const lastKeystrokeTime = useRef<number>(Date.now());
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle Tab Switching / Blur events
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onTelemetryUpdate({
          event: 'tab_switch',
          timestamp: Date.now(),
        });
      }
    };

    const handleWindowBlur = () => {
      onTelemetryUpdate({
        event: 'tab_switch',
        timestamp: Date.now(),
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [onTelemetryUpdate]);

  // Handle typing pauses
  const handleTyping = useCallback(() => {
    const now = Date.now();
    lastKeystrokeTime.current = now;
    setIsTyping(true);

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }

    pauseTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      const pauseDuration = Date.now() - lastKeystrokeTime.current;
      
      onTelemetryUpdate({
        event: 'pause_detected',
        duration: pauseDuration,
        timestamp: Date.now(),
      });
    }, PAUSE_THRESHOLD_MS);
  }, [onTelemetryUpdate]);

  // Cleanup pause timer
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    handleTyping();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    onTelemetryUpdate({
      event: 'paste_attempt',
      timestamp: Date.now()
    });
    // Visual feedback could be added here, but keeping it silent per 'Architecture of Silence'
  };

  return (
    <div className={styles.container}>
      {title && (
        <div className={styles.header}>
          <span>{title}</span>
        </div>
      )}
      <div className={styles.terminalBody}>
        <textarea
          className={styles.textarea}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
};
