'use client';

import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  Settings, 
  Wifi, 
  WifiOff, 
  DollarSign, 
  Hash,
  Folder
} from 'lucide-react';

interface ChatHeaderProps {
  sessionId: string;
  projectPath?: string | undefined;
  connected: boolean;
  totalTokens: number;
  totalCost: number;
  onClear: () => void;
}

export function ChatHeader({
  sessionId,
  projectPath,
  connected,
  totalTokens,
  totalCost,
  onClear,
}: ChatHeaderProps) {
  const formatCost = (cost: number) => {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(4)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens < 1000) return tokens.toString();
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
    return `${(tokens / 1000000).toFixed(1)}M`;
  };

  const getProjectName = () => {
    if (!projectPath) return 'Unknown Project';
    return projectPath.split('/').pop() || 'Unknown Project';
  };

  return (
    <div className="border-b bg-card">
      <div className="flex items-center justify-between p-4">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className={`flex items-center space-x-2 ${connected ? 'text-green-600' : 'text-red-600'}`}>
            {connected ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Project Info */}
          {projectPath && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Folder className="h-4 w-4" />
              <span className="text-sm">{getProjectName()}</span>
            </div>
          )}
        </div>

        {/* Center Section - Session ID */}
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Hash className="h-4 w-4" />
          <span className="text-sm font-mono">
            {sessionId.slice(-8)}
          </span>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Usage Stats */}
          <div className="flex items-center space-x-4 text-sm">
            {/* Tokens */}
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span>{formatTokens(totalTokens)}</span>
            </div>

            {/* Cost */}
            <div className="flex items-center space-x-1 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>{formatCost(totalCost)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 w-8 p-0"
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Session settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}