# Claude Code Web UI - Product Requirements Document

## Executive Summary

This PRD outlines the development of a comprehensive web-based frontend for Anthropic's Claude Code, providing full feature parity with the terminal CLI while offering a modern, intuitive web interface. The application will run Claude Code as a subprocess on the backend, exposing all functionality through a responsive web UI built for individual developers and vibe coders.

## Project Overview

### Vision
Create the definitive web interface for Claude Code that maintains 100% feature parity with the CLI while providing superior user experience through modern web technologies.

### Target Users
- Individual developers and "vibe coders"
- Claude Code power users seeking a web interface
- Developers who prefer GUI interactions over terminal-only workflows

### Core Value Proposition
- **Full Feature Parity**: Everything you can do in Claude Code CLI, you can do in our web UI
- **Modern Interface**: Clean, intuitive, and visually appealing design using prompt-kit components
- **Self-Hosted**: Complete control over your development environment and data
- **Multi-Tenant**: Support for multiple users with their own Claude subscriptions/API keys

## Technical Architecture

### Backend Stack
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Database**: PostgreSQL (via Docker Compose)
- **Caching**: Redis
- **Core Integration**: Claude Code TypeScript SDK (`@anthropic-ai/claude-code`)
- **Architecture Pattern**: Claude Code as subprocess with full process management

### Frontend Stack
- **Framework**: Next.js 15 with App Router
- **React**: React 19
- **Language**: TypeScript
- **Styling**: TailwindCSS 4
- **Chat Components**: prompt-kit (https://www.prompt-kit.com)
- **Linting**: ESLint 9+ (flat config format)

### Authentication & Multi-Tenancy
- **Primary**: Claude Pro/Claude Max subscription support
- **Secondary**: Anthropic API key support
- **Architecture**: Multi-tenant with user isolation
- **Models**: Support for all Claude Code models (Opus 4, Sonnet 4, Haiku 3.5)

## Feature Requirements

### 1. Session Management
- **Database Persistence**: All sessions stored in PostgreSQL for cross-device access
- **Session Types**:
  - New session creation
  - Session resumption with full context
  - Session history browsing
  - Auto-save during conversations
- **Context Management**:
  - Real-time token usage tracking and display
  - Context window management (`/compact`, `/clear` functionality)
  - Cost tracking per message and session total

### 2. Settings Configuration (Mirror Claude Code Hierarchy)
- **User/Global Settings**: `~/.claude/settings.json` equivalent
- **Project Settings**: `.claude/settings.json` equivalent (shared, version controlled)
- **Local Project Settings**: `.claude/settings.local.json` equivalent (personal, git-ignored)
- **UI Features**:
  - Visual settings editor with form validation
  - Import/export settings functionality
  - Real-time settings synchronization
  - Permission management interface

### 3. Built-in Slash Commands (Complete Implementation)

#### Core Session Commands
- `/help` - Interactive command reference with search
- `/init` - Project initialization with CLAUDE.md creation
- `/clear` - Conversation reset with confirmation
- `/compact [focus]` - Context summarization with custom focus
- `/memory` - View/edit project memory interface
- `/cost` - Token usage dashboard with cost breakdown

#### Model & Configuration
- `/model` - Model switcher UI (Opus 4, Sonnet 4, Haiku 3.5)
- `/permissions` - Interactive permissions management dashboard
- `/doctor` - System diagnostics and health check interface

#### GitHub Integration
- `/install-github-app` - GitHub integration setup wizard

#### MCP Management
- `/mcp` - MCP server status dashboard

### 4. Custom Slash Commands
- **File Management**: Support for `.claude/commands/*.md` files
- **UI Features**:
  - Visual command editor with markdown preview
  - Command library browser
  - Argument templating support (`$ARGUMENTS`)
  - Command validation and testing
- **Storage**: Database-backed with file system sync

### 5. MCP (Model Context Protocol) Integration

#### Core MCP Commands Support
- `claude mcp add` - Interactive server addition wizard
- `claude mcp remove` - Server removal with confirmation
- `claude mcp list` - Visual server dashboard with status indicators
- `claude mcp get` - Detailed server information viewer
- `claude mcp serve` - Claude Code as MCP server setup
- `claude mcp reset-project-choices` - Project approval reset
- `claude mcp add-json` - JSON-based server configuration
- `claude mcp add-from-claude-desktop` - Import from Claude Desktop

#### MCP Server Management UI
- **Visual Configuration**: Form-based server setup (no CLI wizards)
- **Scope Management**: User/Project/Local scope selection and visualization
- **Server Status**: Real-time connection monitoring
- **Tool Discovery**: Browse available tools from connected servers
- **OAuth Support**: Visual OAuth flow for authenticated servers
- **Debug Interface**: MCP debugging tools with logs and inspection

### 6. Hooks System (Future Enhancement)
- **Lifecycle Events**: PreToolUse, PostToolUse, Notification, Stop, SubagentStop
- **Backend Execution**: All hooks run on backend server
- **UI Features** (roadmap):
  - Visual hook builder
  - Hook testing and validation
  - Hook library and templates

### 7. Real-Time Features
- **WebSocket Implementation**: Real-time streaming responses
- **Token Tracking**: Live token usage display per message
- **Cost Monitoring**: Real-time cost calculation and display
- **Status Updates**: Live status of long-running operations
- **Progress Indicators**: Visual progress for multi-step operations

### 8. File & Project Management
- **File Browser**: Integrated file explorer with syntax highlighting
- **Code Editor**: Monaco Editor integration for file viewing/editing
- **Git Integration**: Visual git operations (status, commits, branches)
- **Project Templates**: Quick project setup with templates
- **Workspace Management**: Multiple project support

## User Interface Specifications

### Design System
- **Component Library**: prompt-kit for chat interfaces
- **Design Principles**: Modern, clean, intuitive, visually attractive
- **Theme Support**: Light/dark mode with user preference persistence
- **Responsive Design**: Mobile-first approach with desktop optimization

### Key UI Components

#### Chat Interface (prompt-kit based)
```typescript
// Core chat components from prompt-kit
- ChatContainerRoot/Content/ScrollAnchor
- Message components with markdown support
- PromptInput with actions and file upload
- PromptSuggestion for command discovery
- ResponseStream for real-time responses
```

#### Dashboard Views
- **Session Dashboard**: Active sessions, history, cost tracking
- **MCP Dashboard**: Server status, tool availability, connection health
- **Settings Dashboard**: Visual configuration management
- **Project Dashboard**: Project overview, files, git status

#### Specialized Interfaces
- **Command Builder**: Slash command creation and editing
- **Hook Configuration**: Visual hook setup (future)
- **Permission Manager**: Tool and resource permission controls
- **Model Selector**: Model switching with capability comparison

### Navigation Structure
```
├── Dashboard (session overview)
├── Chat Interface (main interaction)
├── Projects
│   ├── File Explorer
│   ├── Settings (project-specific)
│   └── Git Integration
├── MCP Servers
│   ├── Server Management
│   ├── Tool Browser
│   └── Configuration
├── Commands
│   ├── Built-in Commands
│   ├── Custom Commands
│   └── Command Builder
├── Settings
│   ├── User Preferences
│   ├── API Configuration
│   └── Permissions
└── Usage & Billing
    ├── Token Usage
    ├── Cost Tracking
    └── Session Analytics
```

## Implementation Plan

### Phase 1: Core Infrastructure (Weeks 1-4)
- [ ] Backend setup with Node.js/TypeScript
- [ ] PostgreSQL database schema design
- [ ] Redis caching implementation
- [ ] Claude Code subprocess integration
- [ ] Basic authentication and user management
- [ ] Docker Compose development environment

### Phase 2: Basic Chat Interface (Weeks 5-8)
- [ ] Next.js 15 frontend setup with App Router
- [ ] prompt-kit integration and configuration
- [ ] TailwindCSS 4 setup and custom styling
- [ ] Basic chat interface with message streaming
- [ ] Session creation and persistence
- [ ] Real-time WebSocket implementation

### Phase 3: Core Feature Implementation (Weeks 9-16)
- [ ] Built-in slash commands implementation
- [ ] Settings management (all hierarchy levels)
- [ ] Model switching and configuration
- [ ] Token usage and cost tracking
- [ ] Context management (/compact, /clear)
- [ ] Project initialization and CLAUDE.md support

### Phase 4: MCP Integration (Weeks 17-24)
- [ ] MCP command implementation
- [ ] MCP server management UI
- [ ] Server configuration and status monitoring
- [ ] Tool discovery and browsing
- [ ] OAuth integration for authenticated servers
- [ ] Debug and inspection tools

### Phase 5: Advanced Features (Weeks 25-32)
- [ ] Custom slash command management
- [ ] File browser and editor integration
- [ ] Git integration and operations
- [ ] Project templates and workspace management
- [ ] Permission management interface
- [ ] Usage analytics and reporting

### Phase 6: Polish & Optimization (Weeks 33-36)
- [ ] Performance optimization
- [ ] UI/UX refinements
- [ ] Comprehensive testing
- [ ] Documentation completion
- [ ] Deployment preparation

## Technical Specifications

### Database Schema (PostgreSQL)

```sql
-- Users and authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    claude_api_key_encrypted TEXT,
    claude_subscription_type VARCHAR(50),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects and workspaces
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    local_settings JSONB DEFAULT '{}',
    claude_md_content TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    name VARCHAR(255),
    model VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0,
    context_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- tokens, cost, tool calls, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- MCP servers
CREATE TABLE mcp_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id), -- NULL for user-scoped
    name VARCHAR(255) NOT NULL,
    scope VARCHAR(20) NOT NULL, -- 'user', 'project', 'local'
    configuration JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'disconnected',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Custom slash commands
CREATE TABLE custom_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id), -- NULL for user-scoped
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    scope VARCHAR(20) NOT NULL, -- 'user', 'project'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Design

#### Session Management
```typescript
// Session endpoints
POST /api/sessions - Create new session
GET /api/sessions - List user sessions
GET /api/sessions/:id - Get session details
PUT /api/sessions/:id - Update session
DELETE /api/sessions/:id - Delete session

// Message endpoints
POST /api/sessions/:id/messages - Send message
GET /api/sessions/:id/messages - Get session messages
WebSocket /ws/sessions/:id - Real-time message streaming
```

#### MCP Management
```typescript
// MCP endpoints
GET /api/mcp/servers - List MCP servers
POST /api/mcp/servers - Add MCP server
PUT /api/mcp/servers/:id - Update MCP server
DELETE /api/mcp/servers/:id - Remove MCP server
GET /api/mcp/servers/:id/tools - List server tools
POST /api/mcp/servers/:id/test - Test server connection
```

#### Settings Management
```typescript
// Settings endpoints
GET /api/settings/user - Get user settings
PUT /api/settings/user - Update user settings
GET /api/settings/project/:id - Get project settings
PUT /api/settings/project/:id - Update project settings
```

### Claude Code Integration

```typescript
// Claude Code subprocess management
class ClaudeCodeManager {
  private processes: Map<string, ChildProcess> = new Map();
  
  async startSession(sessionId: string, config: SessionConfig): Promise<void> {
    const process = spawn('claude', [
      '--output-format', 'stream-json',
      '--project-path', config.projectPath,
      ...config.additionalArgs
    ]);
    
    this.processes.set(sessionId, process);
    this.setupProcessHandlers(sessionId, process);
  }
  
  async sendMessage(sessionId: string, message: string): Promise<void> {
    const process = this.processes.get(sessionId);
    if (!process) throw new Error('Session not found');
    
    process.stdin?.write(JSON.stringify({ content: message }) + '\n');
  }
  
  async executeSlashCommand(sessionId: string, command: string, args?: string[]): Promise<void> {
    // Handle built-in slash commands
    switch (command) {
      case 'model':
        return this.switchModel(sessionId, args?.[0]);
      case 'mcp':
        return this.handleMcpCommand(sessionId, args);
      // ... other commands
    }
  }
  
  async executeMcpCommand(sessionId: string, mcpCommand: string, args: string[]): Promise<void> {
    const process = this.processes.get(sessionId);
    if (!process) throw new Error('Session not found');
    
    // Execute MCP commands through Claude Code
    const command = ['mcp', mcpCommand, ...args].join(' ');
    process.stdin?.write(command + '\n');
  }
}
```

## Success Metrics

### User Adoption
- Monthly active users
- Session duration and frequency
- Feature adoption rates
- User retention (30, 60, 90 days)

### Technical Performance
- Response time (< 500ms for UI interactions)
- Claude Code subprocess reliability (99.9% uptime)
- WebSocket connection stability
- Database query performance

### Feature Usage
- Slash command usage frequency
- MCP server adoption and configuration success rate
- Custom command creation and usage
- Settings configuration completion rates

## Risk Assessment & Mitigation

### Technical Risks
- **Claude Code subprocess stability**: Implement robust process management with auto-restart
- **WebSocket connection reliability**: Implement reconnection logic and fallback mechanisms
- **Database performance at scale**: Implement proper indexing and query optimization
- **Claude API rate limiting**: Implement intelligent queuing and user feedback

### Business Risks
- **Claude Code API changes**: Monitor Anthropic releases and maintain backward compatibility
- **prompt-kit dependency changes**: Consider component customization and fallback options
- **User adoption**: Focus on superior UX and feature completeness

## Future Roadmap

### Phase 2 Enhancements (6 months post-launch)
- **Real-time Collaboration**: Multi-user session support
- **Advanced Analytics**: Detailed usage insights and optimization suggestions
- **Plugin System**: Third-party integration framework
- **Mobile App**: React Native companion app

### Phase 3 Enhancements (12 months post-launch)
- **Enterprise Features**: Team management, advanced permissions
- **AI-Powered Insights**: Usage optimization recommendations
- **Advanced Automation**: Workflow automation and CI/CD integration
- **Marketplace**: Community-driven commands and templates

## Conclusion

This PRD outlines a comprehensive web frontend for Claude Code that maintains complete feature parity while providing a superior user experience. The focus on self-hosted deployment, modern web technologies, and intuitive design will create the definitive web interface for Claude Code users.

The phased implementation approach ensures steady progress while allowing for user feedback integration and iterative improvements. The technical architecture provides a solid foundation for both current requirements and future enhancements.
