'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WSClientMessage {
  type: 'message' | 'slash_command' | 'stop' | 'ping';
  sessionId: string;
  content?: string;
  command?: string;
  args?: string[];
}

interface WSServerMessage {
  type: 'message' | 'error' | 'status' | 'pong' | 'session_end';
  sessionId: string;
  message?: any;
  error?: string;
  status?: string;
  timestamp: string;
}

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSServerMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = process.env.NODE_ENV === 'development' ? '3001' : window.location.port;
      const token = 'dev-token'; // TODO: Get from auth context
      const url = `${protocol}//${host}:${port}?token=${token}`;
      
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;
        
        // Start ping interval
        const pingInterval = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ 
              type: 'ping',
              sessionId: '',
            }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
        
        ws.current.onclose = () => {
          clearInterval(pingInterval);
          setConnected(false);
          
          // Attempt reconnection if not manually closed
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            console.log(`Reconnection attempt ${reconnectAttempts.current}`);
            
            setTimeout(() => {
              connect();
            }, reconnectDelay.current);
            
            // Exponential backoff
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
          } else {
            setConnectionError('Failed to reconnect after multiple attempts');
          }
        };
      };
      
      ws.current.onmessage = (event) => {
        try {
          const message: WSServerMessage = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WSClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        setConnectionError('Failed to send message');
      }
    } else {
      setConnectionError('WebSocket not connected');
    }
  }, []);

  const disconnect = useCallback(() => {
    reconnectAttempts.current = maxReconnectAttempts; // Prevent reconnection
    if (ws.current) {
      ws.current.close();
    }
  }, []);

  return {
    connected,
    lastMessage,
    connectionError,
    sendMessage,
    disconnect,
  };
}