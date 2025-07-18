import { IncomingMessage } from 'http';
import { parse } from 'url';

import { verify } from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';

import { ClaudeProcessManager } from '@/lib/claude/process-manager';
import { MessageEvent, ProcessConfig, AuthConfig } from '@/types/claude.types';

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

interface WebSocketConnection {
  ws: WebSocket;
  userId: string;
  sessionIds: Set<string>;
  lastPing: Date;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private connections: Map<WebSocket, WebSocketConnection> = new Map();
  private processManager: ClaudeProcessManager;
  private pingInterval!: ReturnType<typeof setInterval>;
  private startTime: Date;

  constructor(port: number = 3001) {
    this.startTime = new Date();
    this.wss = new WebSocketServer({ 
      port,
      verifyClient: this.verifyClient.bind(this),
    });
    
    this.processManager = new ClaudeProcessManager();
    this.setupEventHandlers();
    this.startPingInterval();
    
    console.log(`WebSocket server started on port ${port}`);
  }

  private verifyClient(_info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    // TODO: Implement proper authentication verification
    // For now, allow all connections in development
    return true;
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    // Listen to process manager events
    this.processManager.on('claude-message', (event: MessageEvent) => {
      this.broadcastToSession(event.sessionId, {
        type: 'message',
        sessionId: event.sessionId,
        message: event.data,
        timestamp: event.timestamp.toISOString(),
      });
    });

    this.processManager.on('session-created', (event: MessageEvent) => {
      this.broadcastToSession(event.sessionId, {
        type: 'status',
        sessionId: event.sessionId,
        status: 'created',
        timestamp: event.timestamp.toISOString(),
      });
    });

    this.processManager.on('session-completed', (event: MessageEvent) => {
      this.broadcastToSession(event.sessionId, {
        type: 'session_end',
        sessionId: event.sessionId,
        status: 'completed',
        timestamp: event.timestamp.toISOString(),
      });
    });

    this.processManager.on('process-error', (event: MessageEvent) => {
      this.broadcastToSession(event.sessionId, {
        type: 'error',
        sessionId: event.sessionId,
        error: event.data as string,
        timestamp: event.timestamp.toISOString(),
      });
    });
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    console.log('New WebSocket connection');

    // Extract user ID from query parameters or JWT token
    const url = parse(request.url || '', true);
    const token = url.query.token as string;
    
    let userId: string;
    try {
      // TODO: Verify JWT token properly
      const decoded = this.verifyToken(token);
      userId = decoded.userId;
    } catch (_error) {
      ws.close(1008, 'Invalid authentication token');
      return;
    }

    const connection: WebSocketConnection = {
      ws,
      userId,
      sessionIds: new Set(),
      lastPing: new Date(),
    };

    this.connections.set(ws, connection);

    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(ws);
    });

    // Send connection confirmation
    this.sendMessage(ws, {
      type: 'status',
      sessionId: '',
      status: 'connected',
      timestamp: new Date().toISOString(),
    });
  }

  private async handleMessage(ws: WebSocket, data: Buffer): Promise<void> {
    const connection = this.connections.get(ws);
    if (!connection) return;

    try {
      const message: WSClientMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'ping':
          connection.lastPing = new Date();
          this.sendMessage(ws, {
            type: 'pong',
            sessionId: '',
            timestamp: new Date().toISOString(),
          });
          break;

        case 'message':
          await this.handleChatMessage(connection, message);
          break;

        case 'slash_command':
          await this.handleSlashCommand(connection, message);
          break;

        case 'stop':
          await this.handleStopCommand(connection, message);
          break;

        default:
          this.sendError(ws, '', `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendError(ws, '', 'Invalid message format');
    }
  }

  private async handleChatMessage(connection: WebSocketConnection, message: WSClientMessage): Promise<void> {
    if (!message.content || !message.sessionId) {
      this.sendError(connection.ws, message.sessionId, 'Missing content or sessionId');
      return;
    }

    try {
      // Check if session exists, create if needed
      let session = this.processManager.getSession(message.sessionId);
      
      if (!session) {
        // Create new session
        const config: ProcessConfig = {
          sessionId: message.sessionId,
          userId: connection.userId,
          projectPath: process.cwd(), // TODO: Get from user settings
          model: 'claude-sonnet-4-20250514',
          authConfig: {
            type: 'api_key', // TODO: Get from user settings
            apiKey: process.env.ANTHROPIC_API_KEY,
          } as AuthConfig,
        };

        session = await this.processManager.createSession(config);
        connection.sessionIds.add(message.sessionId);
      }

      await this.processManager.sendMessage(message.sessionId, message.content);
    } catch (error) {
      console.error('Error sending message to Claude:', error);
      this.sendError(connection.ws, message.sessionId, `Failed to send message: ${error}`);
    }
  }

  private async handleSlashCommand(connection: WebSocketConnection, message: WSClientMessage): Promise<void> {
    if (!message.command || !message.sessionId) {
      this.sendError(connection.ws, message.sessionId, 'Missing command or sessionId');
      return;
    }

    try {
      await this.processManager.executeSlashCommand(
        message.sessionId,
        message.command,
        message.args
      );
    } catch (error) {
      console.error('Error executing slash command:', error);
      this.sendError(connection.ws, message.sessionId, `Failed to execute command: ${error}`);
    }
  }

  private async handleStopCommand(connection: WebSocketConnection, message: WSClientMessage): Promise<void> {
    if (!message.sessionId) {
      this.sendError(connection.ws, message.sessionId, 'Missing sessionId');
      return;
    }

    try {
      await this.processManager.killSession(message.sessionId);
      connection.sessionIds.delete(message.sessionId);
    } catch (error) {
      console.error('Error stopping session:', error);
      this.sendError(connection.ws, message.sessionId, `Failed to stop session: ${error}`);
    }
  }

  private handleDisconnection(ws: WebSocket): void {
    const connection = this.connections.get(ws);
    if (!connection) return;

    console.log(`WebSocket disconnected for user ${connection.userId}`);

    // Optionally keep sessions alive or clean them up
    // For now, we'll keep them alive for potential reconnection
    this.connections.delete(ws);
  }

  private broadcastToSession(sessionId: string, message: WSServerMessage): void {
    for (const [ws, connection] of this.connections) {
      if (connection.sessionIds.has(sessionId)) {
        this.sendMessage(ws, message);
      }
    }
  }

  private sendMessage(ws: WebSocket, message: WSServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }

  private sendError(ws: WebSocket, sessionId: string, error: string): void {
    this.sendMessage(ws, {
      type: 'error',
      sessionId,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  private verifyToken(token: string): { userId: string } {
    if (!token) {
      throw new Error('No token provided');
    }

    try {
      const decoded = verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
      return { userId: decoded.userId || 'dev-user' };
    } catch (_error) {
      // In development, allow a simple dev token
      if (token === 'dev-token') {
        return { userId: 'dev-user' };
      }
      throw new Error('Invalid token');
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = 60000; // 1 minute

      for (const [ws, connection] of this.connections) {
        if (now.getTime() - connection.lastPing.getTime() > staleThreshold) {
          console.log(`Closing stale connection for user ${connection.userId}`);
          ws.terminate();
          this.connections.delete(ws);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getSessionCount(): number {
    return this.processManager.getSessionCount();
  }

  public getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  public async stop(): Promise<void> {
    this.close();
  }

  public close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.wss.close();
    
    // Close all connections
    for (const [ws] of this.connections) {
      ws.close();
    }
    
    this.connections.clear();
  }
}