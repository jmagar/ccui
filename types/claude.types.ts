import { ChildProcess } from 'child_process';

export interface ClaudeMessage {
  type: 'system' | 'assistant' | 'user' | 'result';
  subtype?: 'init';
  session_id?: string;
  message?: {
    role: string;
    content: Array<{
      type: 'text' | 'tool_use' | 'tool_result';
      text?: string;
      id?: string;
      name?: string;
      input?: any;
      content?: any;
    }>;
  };
  tools?: string[];
  metadata?: {
    tokens?: number;
    cost?: number;
    duration?: number;
    model?: string;
    incomplete?: boolean;
    reason?: string;
  };
}

export interface SessionConfig {
  userId: string;
  projectPath: string;
  model?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  resume?: string;
  continue?: boolean;
  mcpConfig?: string;
}

export interface ProcessConfig {
  sessionId: string;
  userId: string;
  projectPath: string;
  model: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  authConfig: AuthConfig;
  resume?: string;
  continue?: boolean;
}

export interface AuthConfig {
  type: 'api_key' | 'claude_max' | 'claude_pro' | 'bedrock' | 'vertex' | 'oauth_token';
  apiKey?: string;
  oauthToken?: string;
  region?: string;
  projectId?: string;
}

export interface SessionMapping {
  webSessionId: string;
  claudeSessionId: string;
  claudeProcess: ChildProcess;
  status: 'active' | 'paused' | 'completed' | 'crashed';
  createdAt: Date;
  lastActivity: Date;
  config: ProcessConfig;
  messageCount: number;
}

export interface ProcessStatus {
  sessionId: string;
  status: 'starting' | 'active' | 'processing' | 'waiting_permission' | 'completed' | 'error';
  pid?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  error?: string;
}

export interface MessageEvent {
  type: 'message' | 'error' | 'status' | 'completion';
  sessionId: string;
  data: ClaudeMessage | string | ProcessStatus;
  timestamp: Date;
}

export interface SlashCommand {
  command: string;
  args?: string[];
  description?: string;
}

export interface Usage {
  tokens: number;
  cost: number;
  messageCount: number;
  sessionDuration: number;
}