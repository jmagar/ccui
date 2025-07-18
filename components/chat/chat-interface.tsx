'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatSession } from '@/hooks/use-chat-session';
import { Button } from '@/components/ui/button';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { ChatHeader } from './chat-header';
import { ChatStatus } from './chat-status';

interface ChatInterfaceProps {
  sessionId: string;
  projectPath?: string;
  className?: string;
}

export function ChatInterface({ sessionId, projectPath, className }: ChatInterfaceProps) {
  const {
    session,
    connected,
    connectionError,
    sendMessage,
    executeSlashCommand,
    stopSession,
    clearSession,
    retryLastMessage,
    isProcessing,
    hasError,
  } = useChatSession(sessionId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    setInputValue('');
    
    // Check if it's a slash command
    if (content.startsWith('/')) {
      const parts = content.slice(1).split(' ');
      const command = parts[0];
      const args = parts.slice(1);
      await executeSlashCommand(command, args.length > 0 ? args : undefined);
    } else {
      await sendMessage(content);
    }
  };

  const handleStop = () => {
    stopSession();
  };

  const handleClear = () => {
    clearSession();
  };

  const handleRetry = () => {
    retryLastMessage();
  };

  const getSlashCommandSuggestions = () => {
    return [
      { command: '/help', description: 'Show available commands' },
      { command: '/clear', description: 'Clear conversation history' },
      { command: '/compact', description: 'Summarize conversation to save context' },
      { command: '/memory', description: 'View/edit project memory' },
      { command: '/model', description: 'Switch Claude models' },
      { command: '/permissions', description: 'Manage tool permissions' },
      { command: '/mcp', description: 'MCP server management' },
      { command: '/cost', description: 'View token usage and costs' },
    ];
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <ChatHeader
        sessionId={sessionId}
        projectPath={projectPath}
        connected={connected}
        totalTokens={session.totalTokens}
        totalCost={session.totalCost}
        onClear={handleClear}
      />

      {/* Status */}
      <ChatStatus
        connected={connected}
        connectionError={connectionError ?? undefined}
        sessionStatus={session.status}
        sessionError={session.error}
        isProcessing={isProcessing}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {session.messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <h3 className="text-lg font-medium mb-2">Welcome to Claude Code Web UI</h3>
            <p className="mb-4">Start a conversation or try a slash command:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {getSlashCommandSuggestions().slice(0, 4).map((suggestion) => (
                <Button
                  key={suggestion.command}
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue(suggestion.command + ' ')}
                  className="text-xs"
                >
                  {suggestion.command}
                </Button>
              ))}
            </div>
          </div>
        )}

        {session.messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isProcessing={isProcessing && message === session.messages[session.messages.length - 1]}
          />
        ))}

        {/* Processing indicator */}
        {isProcessing && session.messages.length > 0 && (
          <div className="flex items-center space-x-2 text-muted-foreground">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="text-sm">Claude is thinking...</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              className="ml-auto"
            >
              Stop
            </Button>
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-destructive">Error</h4>
                <p className="text-sm text-destructive/80">
                  {session.error || connectionError}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={!connected}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          disabled={!connected || isProcessing}
          placeholder={
            !connected 
              ? 'Connecting...' 
              : isProcessing 
                ? 'Claude is processing...' 
                : 'Type your message or use / for commands...'
          }
          suggestions={getSlashCommandSuggestions()}
        />
      </div>
    </div>
  );
}