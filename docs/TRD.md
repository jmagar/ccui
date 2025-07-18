# Claude Code Web UI - Technical Requirements Document (TRD)

## 1. Executive Summary

This TRD defines the technical implementation for a web-based GUI wrapper around Anthropic's Claude Code CLI. The system maintains 100% feature parity by running Claude Code as managed subprocesses, providing a modern web interface without reimplementing core functionality.

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js 15    │    │   Node.js API   │    │  Claude Code    │
│   Frontend      │◄──►│   Backend       │◄──►│  CLI Process    │
│                 │    │                 │    │                 │
│ • prompt-kit    │    │ • Process Mgmt  │    │ • Subprocess    │
│ • WebSocket     │    │ • Session Track │    │ • Session State │
│ • React 19      │    │ • Database      │    │ • MCP Servers   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   Database      │
                       └─────────────────┘
```

### 2.2 Core Components

#### 2.2.1 Process Manager
```typescript
class ClaudeProcessManager {
  private processes: Map<string, ClaudeProcess> = new Map();
  private sessionMappings: Map<string, SessionMapping> = new Map();
  
  async createSession(config: SessionConfig): Promise<SessionMapping>
  async resumeSession(claudeSessionId: string): Promise<SessionMapping>
  async killSession(webSessionId: string): Promise<void>
  async handleProcessCrash(webSessionId: string): Promise<void>
}

interface SessionMapping {
  webSessionId: string;
  claudeSessionId: string;
  claudeProcess: ChildProcess;
  status: 'active' | 'paused' | 'completed' | 'crashed';
  createdAt: Date;
  lastActivity: Date;
}
```

#### 2.2.2 Message Parser
```typescript
class ClaudeMessageParser {
  parseStreamJson(data: string): ClaudeMessage[]
  validateMessageFormat(message: any): boolean
  handleIncompleteStream(sessionId: string): void
}

interface ClaudeMessage {
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
    }>;
  };
  tools?: string[];
  metadata?: {
    tokens?: number;
    cost?: number;
    duration?: number;
  };
}
```

## 3. Database Schema

### 3.1 Core Tables

```sql
-- Users and authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    claude_api_key_encrypted TEXT,
    claude_subscription_type VARCHAR(50) CHECK (claude_subscription_type IN ('pro', 'max', 'api')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects and workspaces
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    local_settings JSONB DEFAULT '{}',
    claude_md_content TEXT,
    git_repo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, path)
);

-- Chat sessions with Claude session mapping
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255),
    claude_session_id VARCHAR(255) UNIQUE, -- Claude Code's actual session ID
    model VARCHAR(100) DEFAULT 'claude-sonnet-4-20250514',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'crashed')),
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0,
    context_summary TEXT,
    process_pid INTEGER, -- OS process ID for cleanup
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages with full Claude message format
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    claude_message_type VARCHAR(20) NOT NULL CHECK (claude_message_type IN ('system', 'assistant', 'user', 'result')),
    claude_message_subtype VARCHAR(20),
    role VARCHAR(20), -- 'user', 'assistant', 'system'
    content JSONB NOT NULL, -- Full Claude message content
    metadata JSONB DEFAULT '{}', -- tokens, cost, tool calls, etc.
    sequence_number INTEGER NOT NULL, -- Order within session
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, sequence_number)
);

-- MCP servers configuration
CREATE TABLE mcp_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL for user-scoped
    name VARCHAR(255) NOT NULL,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('user', 'project', 'local')),
    transport VARCHAR(20) DEFAULT 'stdio' CHECK (transport IN ('stdio', 'sse', 'http')),
    configuration JSONB NOT NULL,
    oauth_config JSONB,
    status VARCHAR(50) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
    last_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, project_id, name) -- Unique per user/project combination
);

-- Custom slash commands
CREATE TABLE custom_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL for user-scoped
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('user', 'project')),
    arguments_schema JSONB, -- JSON schema for command arguments
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, project_id, name)
);

-- Process crash logs for debugging
CREATE TABLE process_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'start', 'crash', 'timeout', 'kill'
    pid INTEGER,
    exit_code INTEGER,
    signal VARCHAR(20),
    stderr_output TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_claude_session_id ON sessions(claude_session_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_sequence ON messages(session_id, sequence_number);
CREATE INDEX idx_mcp_servers_user_project ON mcp_servers(user_id, project_id);
CREATE INDEX idx_custom_commands_user_project ON custom_commands(user_id, project_id);
```

## 4. API Specifications

### 4.1 REST API Endpoints

#### 4.1.1 Session Management
```typescript
// Session endpoints
POST   /api/sessions                    // Create new session
GET    /api/sessions                    // List user sessions
GET    /api/sessions/:id                // Get session details
PUT    /api/sessions/:id                // Update session
DELETE /api/sessions/:id                // Delete session
POST   /api/sessions/:id/resume         // Resume existing Claude session
POST   /api/sessions/:id/continue       // Continue last session

// Message endpoints
POST   /api/sessions/:id/messages       // Send message to Claude
GET    /api/sessions/:id/messages       // Get session messages
POST   /api/sessions/:id/slash-command  // Execute slash command

// Real-time WebSocket
WebSocket /ws/sessions/:id              // Real-time message streaming
```

#### 4.1.2 MCP Server Management
```typescript
GET    /api/mcp/servers                 // List MCP servers
POST   /api/mcp/servers                 // Add MCP server
PUT    /api/mcp/servers/:id             // Update MCP server
DELETE /api/mcp/servers/:id             // Remove MCP server
GET    /api/mcp/servers/:id/tools       // List server tools
POST   /api/mcp/servers/:id/test        // Test server connection
POST   /api/mcp/servers/:id/oauth       // Start OAuth flow
GET    /api/mcp/servers/:id/oauth/callback // Handle OAuth callback
```

### 4.2 WebSocket Protocol

```typescript
// Client to Server messages
interface WSClientMessage {
  type: 'message' | 'slash_command' | 'stop' | 'ping';
  sessionId: string;
  content?: string;
  command?: string;
  args?: string[];
}

// Server to Client messages
interface WSServerMessage {
  type: 'message' | 'error' | 'status' | 'pong' | 'session_end';
  sessionId: string;
  message?: ClaudeMessage;
  error?: string;
  status?: 'processing' | 'waiting_permission' | 'complete';
}
```

## 5. Claude Code Integration

### 5.1 Process Management Strategy

```typescript
class ClaudeProcess {
  private process: ChildProcess;
  private messageBuffer: string = '';
  private completionTimeout: NodeJS.Timeout | null = null;
  
  constructor(
    private webSessionId: string,
    private config: ProcessConfig
  ) {}
  
  async start(): Promise<void> {
    const args = this.buildCliArgs();
    this.process = spawn('claude', args, {
      env: this.buildEnvironment(),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.setupEventHandlers();
    this.startCompletionTimeout();
  }
  
  private buildCliArgs(): string[] {
    return [
      '--output-format', 'stream-json',
      '--project-path', this.config.projectPath,
      '--model', this.config.model || 'claude-sonnet-4-20250514',
      ...(this.config.allowedTools ? ['--allowedTools', this.config.allowedTools.join(',')] : []),
      ...(this.config.mcpConfig ? ['--mcp-config', this.config.mcpConfig] : []),
      ...(this.config.resume ? ['--resume', this.config.resume] : []),
      ...(this.config.continue ? ['--continue'] : [])
    ];
  }
  
  private setupEventHandlers(): void {
    this.process.stdout?.on('data', (data) => {
      this.handleStdout(data.toString());
    });
    
    this.process.stderr?.on('data', (data) => {
      this.handleStderr(data.toString());
    });
    
    this.process.on('exit', (code, signal) => {
      this.handleProcessExit(code, signal);
    });
  }
  
  private startCompletionTimeout(): void {
    // Handle stream-json completion bug with 30s timeout
    this.completionTimeout = setTimeout(() => {
      this.handleIncompleteCompletion();
    }, 30000);
  }
  
  private handleIncompleteCompletion(): void {
    // Force session completion if final result message never arrives
    const fakeResultMessage = {
      type: 'result',
      metadata: {
        incomplete: true,
        reason: 'timeout_completion_bug'
      }
    };
    this.emitMessage(fakeResultMessage);
  }
}
```

### 5.2 Authentication Strategy

```typescript
class AuthenticationManager {
  setupClaudeAuth(user: User): Record<string, string> {
    const env: Record<string, string> = {};
    
    switch (user.claude_subscription_type) {
      case 'api':
        env.ANTHROPIC_API_KEY = this.decryptApiKey(user.claude_api_key_encrypted);
        break;
      case 'max':
        env.CLAUDE_USE_MAX = 'true';
        break;
      case 'pro':
        env.CLAUDE_USE_PRO = 'true';
        break;
    }
    
    return env;
  }
  
  private decryptApiKey(encryptedKey: string): string {
    // Use proper encryption/decryption
    return decrypt(encryptedKey, process.env.ENCRYPTION_KEY!);
  }
}
```

## 6. MCP Integration Technical Specifications

### 6.1 MCP Configuration Management

```typescript
class MCPConfigManager {
  async generateMCPConfig(
    userId: string, 
    projectId: string | null
  ): Promise<MCPConfig> {
    const servers = await this.getMCPServers(userId, projectId);
    
    const config: MCPConfig = {
      mcpServers: {}
    };
    
    for (const server of servers) {
      config.mcpServers[server.name] = this.buildServerConfig(server);
    }
    
    return config;
  }
  
  private buildServerConfig(server: MCPServer): MCPServerConfig {
    switch (server.transport) {
      case 'stdio':
        return {
          command: server.configuration.command,
          args: server.configuration.args,
          env: this.resolveEnvironmentVariables(server.configuration.env)
        };
      case 'sse':
        return {
          transport: 'sse',
          url: server.configuration.url,
          headers: server.configuration.headers
        };
      default:
        throw new Error(`Unsupported transport: ${server.transport}`);
    }
  }
  
  private resolveEnvironmentVariables(env: Record<string, string>): Record<string, string> {
    const resolved: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(env)) {
      if (value.startsWith('oauth:')) {
        // Handle OAuth tokens
        resolved[key] = this.resolveOAuthToken(value);
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }
}

interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

interface MCPServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: 'sse';
  url?: string;
  headers?: Record<string, string>;
}
```

### 6.2 OAuth Integration for MCP

```typescript
class MCPOAuthManager {
  async startOAuthFlow(serverId: string): Promise<{ authUrl: string, state: string }> {
    const server = await this.getMCPServer(serverId);
    const state = this.generateState();
    
    const authUrl = this.buildAuthUrl(server.oauth_config, state);
    
    // Store state for verification
    await this.storeOAuthState(state, serverId);
    
    return { authUrl, state };
  }
  
  async handleOAuthCallback(
    code: string, 
    state: string
  ): Promise<{ success: boolean, serverId?: string }> {
    const serverId = await this.verifyOAuthState(state);
    if (!serverId) {
      return { success: false };
    }
    
    const server = await this.getMCPServer(serverId);
    const tokens = await this.exchangeCodeForTokens(server.oauth_config, code);
    
    // Store tokens securely
    await this.storeOAuthTokens(serverId, tokens);
    
    return { success: true, serverId };
  }
  
  private async exchangeCodeForTokens(
    oauthConfig: OAuthConfig, 
    code: string
  ): Promise<OAuthTokens> {
    const response = await fetch(oauthConfig.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        code,
        redirect_uri: oauthConfig.redirectUri
      })
    });
    
    return response.json();
  }
}
```

## 7. Frontend Architecture

### 7.1 Next.js 15 Setup

```typescript
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

// app/providers.tsx
'use client';
import { WebSocketProvider } from '@/components/websocket-provider';
import { AuthProvider } from '@/components/auth-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WebSocketProvider>
        {children}
      </WebSocketProvider>
    </AuthProvider>
  );
}
```

### 7.2 Chat Interface with prompt-kit

```typescript
// components/chat/chat-interface.tsx
'use client';
import {
  ChatContainer,
  ChatContent,
  ChatScrollAnchor,
  Message,
  MessageContent,
  PromptInput,
  PromptSuggestion,
  ResponseStream
} from '@prompt-kit/react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useSession } from '@/hooks/use-session';

export function ChatInterface({ sessionId }: { sessionId: string }) {
  const { messages, sendMessage, isLoading } = useSession(sessionId);
  const { connected } = useWebSocket();
  
  const handleSendMessage = async (content: string) => {
    await sendMessage({
      type: 'message',
      content,
      sessionId
    });
  };
  
  const handleSlashCommand = async (command: string, args: string[]) => {
    await sendMessage({
      type: 'slash_command',
      command,
      args,
      sessionId
    });
  };
  
  return (
    <ChatContainer className="h-full">
      <ChatContent>
        {messages.map((message) => (
          <Message
            key={message.id}
            role={message.role}
            timestamp={message.created_at}
          >
            <MessageContent>
              {renderMessageContent(message.content)}
            </MessageContent>
          </Message>
        ))}
        <ChatScrollAnchor />
      </ChatContent>
      
      <PromptInput
        onSubmit={handleSendMessage}
        onSlashCommand={handleSlashCommand}
        disabled={!connected || isLoading}
        placeholder="Type your message or use / for commands..."
      />
      
      <PromptSuggestion commands={getAvailableCommands()} />
    </ChatContainer>
  );
}
```

### 7.3 Real-time WebSocket Hook

```typescript
// hooks/use-websocket.ts
'use client';
import { useEffect, useRef, useState } from 'react';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSServerMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        setConnected(true);
        // Send ping every 30s to keep connection alive
        const ping = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
        
        ws.current.onclose = () => {
          clearInterval(ping);
          setConnected(false);
          // Reconnect after 3s
          setTimeout(connect, 3000);
        };
      };
      
      ws.current.onmessage = (event) => {
        const message: WSServerMessage = JSON.parse(event.data);
        setLastMessage(message);
      };
    };
    
    connect();
    
    return () => {
      ws.current?.close();
    };
  }, []);
  
  const sendMessage = (message: WSClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };
  
  return { connected, lastMessage, sendMessage };
}
```

## 8. Security Considerations

### 8.1 API Key Encryption

```typescript
import crypto from 'crypto';

class EncryptionManager {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor() {
    this.key = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64');
  }
  
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, this.key);
    decipher.setAAD(iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### 8.2 Process Isolation

```typescript
class ProcessSandbox {
  static createIsolatedEnvironment(user: User, project: Project): ProcessConfig {
    return {
      // Restrict file system access to project directory
      projectPath: this.validateProjectPath(project.path, user.id),
      
      // Set resource limits
      resourceLimits: {
        maxMemory: 512 * 1024 * 1024, // 512MB
        maxCpu: 2, // 2 cores
        timeout: 300000 // 5 minutes
      },
      
      // Sanitize environment variables
      env: this.sanitizeEnvironment(user.settings),
      
      // Disable dangerous tools by default
      disallowedTools: ['Bash(rm *)', 'Bash(sudo *)']
    };
  }
  
  private static validateProjectPath(path: string, userId: string): string {
    // Ensure path is within user's allowed directories
    const allowedPaths = [`/projects/${userId}/`, `/tmp/${userId}/`];
    
    if (!allowedPaths.some(allowed => path.startsWith(allowed))) {
      throw new Error('Invalid project path');
    }
    
    return path;
  }
}
```

## 9. Performance Requirements

### 9.1 Response Time Targets
- **UI Interactions**: < 100ms
- **Message Sending**: < 200ms  
- **Session Creation**: < 1000ms
- **Database Queries**: < 50ms
- **WebSocket Message Propagation**: < 50ms

### 9.2 Scalability Targets
- **Concurrent Sessions**: 1000 per server instance
- **Messages per Second**: 10,000 across all sessions
- **Database Connections**: Pool of 20-50 connections
- **Memory Usage**: < 2GB per server instance

### 9.3 Caching Strategy

```typescript
// Redis caching for session state
class SessionCache {
  private redis: Redis;
  
  async cacheSessionState(sessionId: string, state: SessionState): Promise<void> {
    await this.redis.setex(
      `session:${sessionId}`, 
      3600, // 1 hour TTL
      JSON.stringify(state)
    );
  }
  
  async getCachedSessionState(sessionId: string): Promise<SessionState | null> {
    const cached = await this.redis.get(`session:${sessionId}`);
    return cached ? JSON.parse(cached) : null;
  }
}
```

## 10. Deployment Strategy

### 10.1 Docker Containerization

```dockerfile
# Dockerfile
FROM node:18-alpine

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

### 10.2 Docker Compose Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/claude_web_ui
      - REDIS_URL=redis://redis:6379
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./projects:/app/projects # Mount project directories

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=claude_web_ui
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 11. Testing Strategy

### 11.1 Unit Tests

```typescript
// tests/process-manager.test.ts
describe('ClaudeProcessManager', () => {
  let manager: ClaudeProcessManager;
  
  beforeEach(() => {
    manager = new ClaudeProcessManager();
  });
  
  test('should create new session successfully', async () => {
    const config = {
      projectPath: '/test/project',
      model: 'claude-sonnet-4-20250514'
    };
    
    const session = await manager.createSession(config);
    
    expect(session.webSessionId).toBeDefined();
    expect(session.claudeSessionId).toBeDefined();
    expect(session.status).toBe('active');
  });
  
  test('should handle process crash gracefully', async () => {
    const sessionId = 'test-session-id';
    
    // Simulate process crash
    await manager.handleProcessCrash(sessionId);
    
    const session = await manager.getSession(sessionId);
    expect(session.status).toBe('crashed');
  });
});
```

### 11.2 Integration Tests

```typescript
// tests/api.integration.test.ts
describe('Session API Integration', () => {
  test('should create session via API', async () => {
    const response = await request(app)
      .post('/api/sessions')
      .send({
        projectId: 'test-project-id',
        model: 'claude-sonnet-4-20250514'
      })
      .expect(201);
    
    expect(response.body.session.id).toBeDefined();
    expect(response.body.session.status).toBe('active');
  });
  
  test('should send message to Claude', async () => {
    const sessionId = 'test-session-id';
    
    const response = await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .send({
        content: 'Hello Claude'
      })
      .expect(200);
    
    expect(response.body.message).toBeDefined();
  });
});
```

### 11.3 End-to-End Tests

```typescript
// tests/e2e/chat.e2e.test.ts
import { test, expect } from '@playwright/test';

test('complete chat flow', async ({ page }) => {
  await page.goto('/');
  
  // Create new session
  await page.click('[data-testid="new-session"]');
  await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
  
  // Send message
  await page.fill('[data-testid="message-input"]', 'Hello Claude');
  await page.click('[data-testid="send-button"]');
  
  // Wait for response
  await expect(page.locator('[data-testid="claude-response"]')).toBeVisible();
});
```

## 12. Monitoring and Observability

### 12.1 Metrics Collection

```typescript
class MetricsCollector {
  private promClient = require('prom-client');
  
  constructor() {
    // Session metrics
    this.sessionCounter = new this.promClient.Counter({
      name: 'claude_sessions_total',
      help: 'Total number of Claude sessions created',
      labelNames: ['user_id', 'project_id', 'model']
    });
    
    this.messageCounter = new this.promClient.Counter({
      name: 'claude_messages_total',
      help: 'Total number of messages sent to Claude',
      labelNames: ['session_id', 'message_type']
    });
    
    this.responseTimeHistogram = new this.promClient.Histogram({
      name: 'claude_response_time_seconds',
      help: 'Claude response time in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });
  }
  
  recordSession(userId: string, projectId: string, model: string): void {
    this.sessionCounter.inc({ user_id: userId, project_id: projectId, model });
  }
  
  recordMessage(sessionId: string, messageType: string): void {
    this.messageCounter.inc({ session_id: sessionId, message_type: messageType });
  }
  
  recordResponseTime(duration: number): void {
    this.responseTimeHistogram.observe(duration);
  }
}
```

### 12.2 Health Checks

```typescript
// api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      claude_cli: await checkClaudeCLI()
    }
  };
  
  const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
  
  return Response.json(health, {
    status: allHealthy ? 200 : 503
  });
}

async function checkClaudeCLI(): Promise<HealthCheck> {
  try {
    const result = await execAsync('claude --version');
    return {
      status: 'healthy',
      details: { version: result.stdout.trim() }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: { error: error.message }
    };
  }
}
```

## 13. Error Handling and Recovery

### 13.1 Process Recovery

```typescript
class ProcessRecoveryManager {
  private recoveryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;
  
  async handleProcessFailure(sessionId: string, error: ProcessError): Promise<void> {
    const attempts = this.recoveryAttempts.get(sessionId) || 0;
    
    if (attempts >= this.maxRetries) {
      await this.markSessionAsFailed(sessionId, error);
      return;
    }
    
    this.recoveryAttempts.set(sessionId, attempts + 1);
    
    // Attempt recovery based on error type
    switch (error.type) {
      case 'process_crash':
        await this.restartProcess(sessionId);
        break;
      case 'stream_timeout':
        await this.handleStreamTimeout(sessionId);
        break;
      case 'permission_error':
        await this.retryWithPermissions(sessionId);
        break;
    }
  }
  
  private async handleStreamTimeout(sessionId: string): Promise<void> {
    // Handle the known stream-json completion bug
    const session = await this.getSession(sessionId);
    
    // Send synthetic completion message
    await this.sendSyntheticCompletion(sessionId, {
      type: 'result',
      metadata: {
        incomplete: true,
        reason: 'stream_timeout_recovery'
      }
    });
  }
}
```

## 14. Configuration Management

### 14.1 Environment Configuration

```typescript
// config/environment.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().min(32),
  
  // Claude Code specific
  CLAUDE_CODE_PATH: z.string().default('claude'),
  CLAUDE_PROCESS_TIMEOUT: z.number().default(300000), // 5 minutes
  MAX_CONCURRENT_SESSIONS: z.number().default(100),
  
  // Security
  JWT_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().transform(str => str.split(',')),
  
  // Monitoring
  PROMETHEUS_PORT: z.number().default(9090),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

export const env = envSchema.parse(process.env);
export type Environment = z.infer<typeof envSchema>;
```

## 15. Conclusion

This TRD provides a comprehensive technical foundation for building a web GUI wrapper around Claude Code CLI. The architecture maintains 100% feature parity by leveraging the existing CLI rather than reimplementing functionality, ensuring compatibility and reducing development complexity.

Key technical decisions:
- **Subprocess Management**: Direct CLI integration with proper process lifecycle management
- **Session Mapping**: One-to-one mapping between web sessions and Claude sessions
- **Real-time Communication**: WebSocket-based streaming for responsive UI
- **Security**: Proper API key encryption and process isolation
- **Scalability**: Designed for 1000+ concurrent sessions per instance

The implementation prioritizes reliability, security, and faithful CLI behavior replication over custom feature development.
