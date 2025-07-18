'use client';

import { AlertCircle, CheckCircle2, Clock, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChatStatusProps {
  connected: boolean;
  connectionError?: string | undefined;
  sessionStatus: 'idle' | 'processing' | 'error' | 'completed';
  sessionError?: string | undefined;
  isProcessing: boolean;
}

export function ChatStatus({
  connected,
  connectionError,
  sessionStatus,
  sessionError,
  isProcessing,
}: ChatStatusProps) {
  // Don't show status when everything is working normally
  if (connected && sessionStatus === 'idle' && !sessionError && !connectionError) {
    return null;
  }

  const getStatusIcon = () => {
    if (!connected) return <WifiOff className="h-4 w-4" />;
    if (sessionStatus === 'error' || sessionError) return <AlertCircle className="h-4 w-4" />;
    if (sessionStatus === 'processing' || isProcessing) return <Clock className="h-4 w-4" />;
    if (sessionStatus === 'completed') return <CheckCircle2 className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    if (!connected) {
      return connectionError || 'Disconnected from server';
    }
    
    if (sessionError) {
      return `Session error: ${sessionError}`;
    }
    
    switch (sessionStatus) {
      case 'processing':
        return 'Claude is processing your request...';
      case 'error':
        return 'An error occurred during processing';
      case 'completed':
        return 'Session completed successfully';
      default:
        return 'Ready';
    }
  };

  const getStatusVariant = () => {
    if (!connected || sessionStatus === 'error' || sessionError) {
      return 'destructive';
    }
    if (sessionStatus === 'processing' || isProcessing) {
      return 'default';
    }
    if (sessionStatus === 'completed') {
      return 'default';
    }
    return 'default';
  };

  const isError = !connected || sessionStatus === 'error' || sessionError;
  const isCurrentlyProcessing = sessionStatus === 'processing';

  return (
    <div className="px-4 py-2 border-b">
      <Alert variant={getStatusVariant()} className={`
        ${isError ? 'border-destructive/50 bg-destructive/5' : ''}
        ${isCurrentlyProcessing ? 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20' : ''}
      `}>
        <div className="flex items-center space-x-2">
          <div className={`
            ${isError ? 'text-destructive' : ''}
            ${isCurrentlyProcessing ? 'text-blue-600 dark:text-blue-400' : ''}
          `}>
            {getStatusIcon()}
          </div>
          <AlertDescription className={`
            ${isError ? 'text-destructive' : ''}
            ${isCurrentlyProcessing ? 'text-blue-700 dark:text-blue-300' : ''}
          `}>
            {getStatusMessage()}
          </AlertDescription>
          
          {/* Processing animation */}
          {isCurrentlyProcessing && (
            <div className="ml-auto">
              <div className="loading-dots">
                <span className="bg-blue-600"></span>
                <span className="bg-blue-600"></span>
                <span className="bg-blue-600"></span>
              </div>
            </div>
          )}
        </div>
      </Alert>
    </div>
  );
}