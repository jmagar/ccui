import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

import { v4 as uuidv4 } from 'uuid';

import {
  ProcessConfig,
  SessionMapping,
  ClaudeMessage,
  MessageEvent,
  ProcessStatus,
  AuthConfig,
} from '@/types/claude.types';

export class ClaudeProcessManager extends EventEmitter {
  private processes: Map<string, SessionMapping> = new Map();
  private completionTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly COMPLETION_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_CONCURRENT_SESSIONS = 100;

  constructor() {
    super();
    this.setupCleanupHandlers();
  }

  async createSession(config: ProcessConfig): Promise<SessionMapping> {
    if (this.processes.size >= this.MAX_CONCURRENT_SESSIONS) {
      throw new Error('Maximum concurrent sessions reached');
    }

    const webSessionId = uuidv4();
    const args = this.buildCliArgs(config);
    const env = this.buildEnvironment(config.authConfig);

    try {
      const claudeProcess = spawn('claude', args, {
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: config.projectPath,
      });

      const sessionMapping: SessionMapping = {
        webSessionId,
        claudeSessionId: '', // Will be set when we receive init message
        claudeProcess: claudeProcess,
        status: 'active',
        createdAt: new Date(),
        lastActivity: new Date(),
        config,
        messageCount: 0,
      };

      this.processes.set(webSessionId, sessionMapping);
      this.setupProcessHandlers(webSessionId, claudeProcess);
      this.startCompletionTimeout(webSessionId);

      this.emit('session-created', {
        type: 'status',
        sessionId: webSessionId,
        data: {
          sessionId: webSessionId,
          status: 'starting',
          pid: claudeProcess.pid,
        } as ProcessStatus,
        timestamp: new Date(),
      } as MessageEvent);

      return sessionMapping;
    } catch (error) {
      throw new Error(`Failed to create Claude process: ${error}`);
    }
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.processes.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session ${sessionId} is not active`);
    }

    try {
      session.claudeProcess.stdin?.write(content + '\n');
      session.lastActivity = new Date();
      session.messageCount++;
      
      this.emit('message-sent', {
        type: 'message',
        sessionId,
        data: {
          type: 'user',
          message: {
            role: 'user',
            content: [{ type: 'text', text: content }],
          },
        } as ClaudeMessage,
        timestamp: new Date(),
      } as MessageEvent);
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  async executeSlashCommand(sessionId: string, command: string, args?: string[]): Promise<void> {
    const fullCommand = args?.length ? `/${command} ${args.join(' ')}` : `/${command}`;
    await this.sendMessage(sessionId, fullCommand);
  }

  async killSession(sessionId: string): Promise<void> {
    const session = this.processes.get(sessionId);
    if (!session) {
      return;
    }

    try {
      // Clear completion timeout
      const timeout = this.completionTimeouts.get(sessionId);
      if (timeout) {
        clearTimeout(timeout);
        this.completionTimeouts.delete(sessionId);
      }

      // Kill the process
      if (session.claudeProcess.pid) {
        session.claudeProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (!session.claudeProcess.killed) {
            session.claudeProcess.kill('SIGKILL');
          }
        }, 5000);
      }

      session.status = 'completed';
      this.processes.delete(sessionId);

      this.emit('session-ended', {
        type: 'status',
        sessionId,
        data: {
          sessionId,
          status: 'completed',
        } as ProcessStatus,
        timestamp: new Date(),
      } as MessageEvent);
    } catch (error) {
      console.error(`Error killing session ${sessionId}:`, error);
    }
  }

  getSession(sessionId: string): SessionMapping | undefined {
    return this.processes.get(sessionId);
  }

  getAllSessions(): SessionMapping[] {
    return Array.from(this.processes.values());
  }

  getSessionCount(): number {
    return this.processes.size;
  }

  private buildCliArgs(config: ProcessConfig): string[] {
    const args = [
      '--output-format', 'stream-json',
      '--project-path', config.projectPath,
      '--model', config.model || 'claude-sonnet-4-20250514',
    ];

    if (config.allowedTools?.length) {
      args.push('--allowed-tools', config.allowedTools.join(','));
    }

    if (config.disallowedTools?.length) {
      args.push('--disallowed-tools', config.disallowedTools.join(','));
    }

    if (config.resume) {
      args.push('--resume', config.resume);
    }

    if (config.continue) {
      args.push('--continue');
    }

    return args;
  }

  private buildEnvironment(authConfig: AuthConfig): Record<string, string> {
    const env: Record<string, string> = {};

    switch (authConfig.type) {
      case 'api_key':
        if (authConfig.apiKey) {
          env.ANTHROPIC_API_KEY = authConfig.apiKey;
        }
        break;
      case 'claude_max':
        env.CLAUDE_USE_MAX = 'true';
        break;
      case 'claude_pro':
        env.CLAUDE_USE_PRO = 'true';
        break;
      case 'bedrock':
        env.CLAUDE_CODE_USE_BEDROCK = '1';
        if (authConfig.region) {
          env.AWS_REGION = authConfig.region;
        }
        break;
      case 'vertex':
        env.CLAUDE_CODE_USE_VERTEX = '1';
        if (authConfig.projectId) {
          env.GOOGLE_CLOUD_PROJECT = authConfig.projectId;
        }
        break;
      case 'oauth_token':
        if (authConfig.oauthToken) {
          env.CLAUDE_CODE_OAUTH_TOKEN = authConfig.oauthToken;
        }
        break;
    }

    return env;
  }

  private setupProcessHandlers(sessionId: string, claudeProcess: ChildProcess): void {
    let messageBuffer = '';

    // Handle stdout (stream-json messages)
    claudeProcess.stdout?.on('data', (data: Buffer) => {
      messageBuffer += data.toString();
      this.processMessageBuffer(sessionId, messageBuffer);
      messageBuffer = this.clearProcessedMessages(messageBuffer);
    });

    // Handle stderr (errors and diagnostics)
    claudeProcess.stderr?.on('data', (data: Buffer) => {
      const errorText = data.toString();
      console.error(`Claude process stderr [${sessionId}]:`, errorText);
      
      this.emit('process-error', {
        type: 'error',
        sessionId,
        data: errorText,
        timestamp: new Date(),
      } as MessageEvent);
    });

    // Handle process exit
    claudeProcess.on('exit', (code, signal) => {
      this.handleProcessExit(sessionId, code, signal);
    });

    // Handle process errors
    claudeProcess.on('error', (error) => {
      this.handleProcessError(sessionId, error);
    });
  }

  private processMessageBuffer(sessionId: string, buffer: string): void {
    const lines = buffer.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const message: ClaudeMessage = JSON.parse(line);
          this.handleClaudeMessage(sessionId, message);
        } catch (_error) {
          // Incomplete JSON, will be processed in next buffer
          continue;
        }
      }
    }
  }

  private clearProcessedMessages(buffer: string): string {
    const lines = buffer.split('\n');
    const incompleteLines: string[] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          JSON.parse(line);
          // Successfully parsed, can be removed
        } catch (_error) {
          // Incomplete JSON, keep for next processing
          incompleteLines.push(line);
        }
      }
    }
    
    return incompleteLines.join('\n');
  }

  private handleClaudeMessage(sessionId: string, message: ClaudeMessage): void {
    const session = this.processes.get(sessionId);
    if (!session) return;

    // Update session with Claude session ID if this is an init message
    if (message.type === 'system' && message.subtype === 'init' && message.session_id) {
      session.claudeSessionId = message.session_id;
    }

    // Reset completion timeout on any message
    this.resetCompletionTimeout(sessionId);

    // Handle result messages (session completion)
    if (message.type === 'result') {
      this.handleSessionCompletion(sessionId);
    }

    session.lastActivity = new Date();

    this.emit('claude-message', {
      type: 'message',
      sessionId,
      data: message,
      timestamp: new Date(),
    } as MessageEvent);
  }

  private startCompletionTimeout(sessionId: string): void {
    const timeout = setTimeout(() => {
      this.handleIncompleteCompletion(sessionId);
    }, this.COMPLETION_TIMEOUT);
    
    this.completionTimeouts.set(sessionId, timeout);
  }

  private resetCompletionTimeout(sessionId: string): void {
    const existingTimeout = this.completionTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    this.startCompletionTimeout(sessionId);
  }

  private handleIncompleteCompletion(sessionId: string): void {
    // Handle the known stream-json completion bug
    const fakeResultMessage: ClaudeMessage = {
      type: 'result',
      metadata: {
        incomplete: true,
        reason: 'timeout_completion_bug',
      },
    };
    
    this.handleClaudeMessage(sessionId, fakeResultMessage);
  }

  private handleSessionCompletion(sessionId: string): void {
    const session = this.processes.get(sessionId);
    if (!session) return;

    session.status = 'completed';
    
    // Clear completion timeout
    const timeout = this.completionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.completionTimeouts.delete(sessionId);
    }

    this.emit('session-completed', {
      type: 'completion',
      sessionId,
      data: {
        sessionId,
        status: 'completed',
      } as ProcessStatus,
      timestamp: new Date(),
    } as MessageEvent);
  }

  private handleProcessExit(sessionId: string, code: number | null, signal: string | null): void {
    const session = this.processes.get(sessionId);
    if (!session) return;

    console.log(`Claude process exited [${sessionId}]: code=${code}, signal=${signal}`);
    
    session.status = code === 0 ? 'completed' : 'crashed';
    
    this.emit('process-exit', {
      type: 'status',
      sessionId,
      data: {
        sessionId,
        status: session.status,
        error: code !== 0 ? `Process exited with code ${code}` : undefined,
      } as ProcessStatus,
      timestamp: new Date(),
    } as MessageEvent);

    // Cleanup
    this.processes.delete(sessionId);
    const timeout = this.completionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.completionTimeouts.delete(sessionId);
    }
  }

  private handleProcessError(sessionId: string, error: Error): void {
    const session = this.processes.get(sessionId);
    if (!session) return;

    console.error(`Claude process error [${sessionId}]:`, error);
    
    session.status = 'crashed';
    
    this.emit('process-error', {
      type: 'error',
      sessionId,
      data: error.message,
      timestamp: new Date(),
    } as MessageEvent);
  }

  private setupCleanupHandlers(): void {
    // Cleanup on process exit
    process.on('exit', () => {
      this.cleanup();
    });

    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  private cleanup(): void {
    console.log('Cleaning up Claude processes...');
    
    for (const [sessionId] of this.processes) {
      this.killSession(sessionId);
    }
    
    // Clear all timeouts
    for (const timeout of this.completionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.completionTimeouts.clear();
  }
}