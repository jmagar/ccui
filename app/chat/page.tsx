'use client';

import { Plus, FolderOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { ChatInterface } from '@/components/chat/chat-interface';
import { Button } from '@/components/ui/button';

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [projectPath, setProjectPath] = useState<string>('');
  
  // Generate initial session ID
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    // Attempt to detect project path from browser location or localStorage
    const currentPath = localStorage.getItem('claude-project-path') || process.cwd() || '/home/user/project';
    setProjectPath(currentPath);
  }, []);
  
  const handleNewSession = () => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
  };
  
  const handleOpenProject = () => {
    // In a real implementation, this would open a file/folder picker
    // For now, just prompt for project path
    const newPath = prompt('Enter project path:', projectPath);
    if (newPath) {
      setProjectPath(newPath);
      localStorage.setItem('claude-project-path', newPath);
    }
  };
  
  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </Link>
          
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold">Claude Code Chat</h1>
            {projectPath && (
              <span className="text-sm text-muted-foreground">
                • {projectPath.split('/').pop()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenProject}
            className="flex items-center space-x-2"
          >
            <FolderOpen className="h-4 w-4" />
            <span>Open Project</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewSession}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Session</span>
          </Button>
        </div>
      </div>
      
      {/* Main Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          sessionId={sessionId}
          projectPath={projectPath}
          className="h-full"
        />
      </div>
    </div>
  );
}