'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './use-websocket';
import { ClaudeMessage } from '@/types/claude.types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    cost?: number;
    toolUse?: any[];
    incomplete?: boolean;
  };
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  status: 'idle' | 'processing' | 'error' | 'completed';
  error?: string | undefined;
  totalTokens: number;
  totalCost: number;
}

export function useChatSession(sessionId: string) {
  const { connected, lastMessage, connectionError, sendMessage } = useWebSocket();
  const [session, setSession] = useState<ChatSession>({
    id: sessionId,
    messages: [],
    status: 'idle',
    totalTokens: 0,
    totalCost: 0,
  });

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage || lastMessage.sessionId !== sessionId) return;

    switch (lastMessage.type) {
      case 'message':
        handleClaudeMessage(lastMessage.message);
        break;
      case 'error':
        setSession(prev => ({
          ...prev,
          status: 'error',
          error: lastMessage.error,
        }));
        break;
      case 'status':
        if (lastMessage.status === 'processing') {
          setSession(prev => ({
            ...prev,
            status: 'processing',
          }));
        }
        break;
      case 'session_end':
        setSession(prev => ({
          ...prev,
          status: 'completed',
        }));
        break;
    }
  }, [lastMessage, sessionId]);

  const handleClaudeMessage = useCallback((claudeMessage: ClaudeMessage) => {
    const messageId = `${Date.now()}-${Math.random()}`;
    
    switch (claudeMessage.type) {
      case 'user':
        // User message (echo from our own send)
        if (claudeMessage.message?.content) {
          const textContent = claudeMessage.message.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('');
          
          addMessage({
            id: messageId,
            role: 'user',
            content: textContent,
            timestamp: new Date(),
          });
        }
        break;

      case 'assistant':
        // Assistant response
        if (claudeMessage.message?.content) {
          const textContent = claudeMessage.message.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('');
          
          const toolUse = claudeMessage.message.content
            .filter(c => c.type === 'tool_use');

          addMessage({
            id: messageId,
            role: 'assistant',
            content: textContent,
            timestamp: new Date(),
            metadata: {
              tokens: claudeMessage.metadata?.tokens ?? undefined,
              cost: claudeMessage.metadata?.cost ?? undefined,
              toolUse: toolUse.length > 0 ? toolUse : undefined,
              incomplete: claudeMessage.metadata?.incomplete ?? undefined,
            },
          });
        }
        break;

      case 'system':
        // System message (usually init or status)
        if (claudeMessage.subtype === 'init') {
          setSession(prev => ({
            ...prev,
            status: 'idle',
          }));
        }
        break;

      case 'result':
        // Session completion
        setSession(prev => ({
          ...prev,
          status: 'completed',
          totalTokens: prev.totalTokens + (claudeMessage.metadata?.tokens || 0),
          totalCost: prev.totalCost + (claudeMessage.metadata?.cost || 0),
        }));
        break;
    }
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, message],
      totalTokens: prev.totalTokens + (message.metadata?.tokens || 0),
      totalCost: prev.totalCost + (message.metadata?.cost || 0),
    }));
  }, []);

  const sendChatMessage = useCallback(async (content: string) => {
    if (!connected) {
      setSession(prev => ({
        ...prev,
        status: 'error',
        error: 'Not connected to server',
      }));
      return;
    }

    setSession(prev => ({
      ...prev,
      status: 'processing',
      error: undefined,
    }));

    sendMessage({
      type: 'message',
      sessionId,
      content,
    });
  }, [connected, sendMessage, sessionId]);

  const executeSlashCommand = useCallback(async (command: string, args?: string[]) => {
    if (!connected) {
      setSession(prev => ({
        ...prev,
        status: 'error',
        error: 'Not connected to server',
      }));
      return;
    }

    setSession(prev => ({
      ...prev,
      status: 'processing',
      error: undefined,
    }));

    sendMessage({
      type: 'slash_command',
      sessionId,
      command,
      args: args ?? [],
    });
  }, [connected, sendMessage, sessionId]);

  const stopSession = useCallback(() => {
    sendMessage({
      type: 'stop',
      sessionId,
    });
  }, [sendMessage, sessionId]);

  const clearSession = useCallback(() => {
    setSession(prev => ({
      ...prev,
      messages: [],
      status: 'idle',
      error: undefined,
      totalTokens: 0,
      totalCost: 0,
    }));
  }, []);

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = session.messages
      .filter(m => m.role === 'user')
      .pop();
    
    if (lastUserMessage) {
      sendChatMessage(lastUserMessage.content);
    }
  }, [session.messages, sendChatMessage]);

  return {
    session,
    connected,
    connectionError,
    sendMessage: sendChatMessage,
    executeSlashCommand,
    stopSession,
    clearSession,
    retryLastMessage,
    isProcessing: session.status === 'processing',
    hasError: session.status === 'error' || !!connectionError,
  };
}