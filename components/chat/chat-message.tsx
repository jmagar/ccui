'use client';

import { formatDistanceToNow } from 'date-fns';
import { User, Bot, Settings } from 'lucide-react';

import { ChatMessage as ChatMessageType } from '@/hooks/use-chat-session';

interface ChatMessageProps {
  message: ChatMessageType;
  isProcessing?: boolean;
}

export function ChatMessage({ message, isProcessing }: ChatMessageProps) {
  const formatContent = (content: string) => {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-lg overflow-x-auto"><code>$1</code></pre>');
  };

  const getRoleIcon = () => {
    switch (message.role) {
      case 'user':
        return <User className="h-6 w-6" />;
      case 'assistant':
        return <Bot className="h-6 w-6" />;
      case 'system':
        return <Settings className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const getRoleColor = () => {
    switch (message.role) {
      case 'user':
        return 'bg-primary text-primary-foreground';
      case 'assistant':
        return 'bg-secondary text-secondary-foreground';
      case 'system':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatMetadata = () => {
    if (!message.metadata) return null;
    
    const parts = [];
    if (message.metadata.tokens) {
      parts.push(`${message.metadata.tokens} tokens`);
    }
    if (message.metadata.cost) {
      parts.push(`$${message.metadata.cost.toFixed(4)}`);
    }
    if (message.metadata.incomplete) {
      parts.push('incomplete');
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  return (
    <div className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getRoleColor()}`}>
        {getRoleIcon()}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
        {/* Message Bubble */}
        <div
          className={`inline-block p-3 rounded-lg ${
            message.role === 'user'
              ? 'bg-primary text-primary-foreground ml-auto'
              : message.role === 'assistant'
                ? 'bg-card border'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {/* Content */}
          <div 
            className="message-content prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />

          {/* Tool Use Indicator */}
          {message.metadata?.toolUse && message.metadata.toolUse.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/20">
              <div className="text-xs text-muted-foreground">
                Used tools: {message.metadata.toolUse.map(tool => tool.name).join(', ')}
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-xs text-muted-foreground">Processing...</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
          <div className={message.role === 'user' ? 'order-2' : 'order-1'}>
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </div>
          
          {formatMetadata() && (
            <div className={message.role === 'user' ? 'order-1' : 'order-2'}>
              {formatMetadata()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}