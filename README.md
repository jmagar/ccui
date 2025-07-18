# Claude Code Web UI (CCUI)

A comprehensive web-based frontend for Anthropic's Claude Code CLI, providing full feature parity with the terminal interface through a modern, intuitive web application.

## Overview

Claude Code Web UI maintains 100% compatibility with Claude Code CLI by running it as managed subprocesses, exposing all functionality through a responsive web interface built with Next.js 15 and React 19.

### Key Features

- **Full Feature Parity**: Everything available in Claude Code CLI works in the web UI
- **Real-time Streaming**: WebSocket-based chat interface with live responses
- **Session Management**: Persistent sessions with cross-device access
- **MCP Integration**: Complete Model Context Protocol server management
- **Multi-tenant**: Support for multiple users with individual Claude subscriptions
- **Enterprise Ready**: AWS Bedrock and GCP Vertex AI support

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Claude Code CLI installed globally: `npm install -g @anthropic-ai/claude-code`

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ccui.git
cd ccui

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development environment
docker-compose up -d
npm run dev
```

Visit `http://localhost:3000` to access the web interface.

## Architecture

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

### Core Components

- **Process Manager**: Handles Claude Code subprocess lifecycle
- **Session Manager**: Maps web sessions to Claude sessions
- **Message Parser**: Processes Claude Code's stream-json output
- **MCP Manager**: Manages Model Context Protocol servers
- **Authentication**: Support for API keys, Claude Pro/Max, and enterprise options

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Caching**: Redis
- **Integration**: Claude Code CLI subprocess management

### Frontend
- **Framework**: Next.js 15 with App Router
- **React**: React 19
- **Language**: TypeScript
- **Styling**: TailwindCSS 4
- **Components**: prompt-kit for chat interfaces
- **Linting**: ESLint 9+ (flat config)

## Authentication

Multiple authentication methods supported:

### API Key
```bash
export ANTHROPIC_API_KEY="sk-your-key-here"
```

### Claude Pro/Max Subscriptions
```bash
export CLAUDE_USE_MAX=true
# or
export CLAUDE_USE_PRO=true
```

### Enterprise Options
```bash
# AWS Bedrock
export CLAUDE_CODE_USE_BEDROCK=1

# Google Vertex AI
export CLAUDE_CODE_USE_VERTEX=1
```

## Features

### Built-in Slash Commands

All Claude Code slash commands are supported:

- `/help` - Show available commands
- `/init` - Initialize project with CLAUDE.md
- `/clear` - Reset conversation history
- `/compact [focus]` - Summarize conversation to save context
- `/memory` - View/edit project memory
- `/model <model-name>` - Switch Claude models
- `/permissions` - Interactive permissions management
- `/mcp` - MCP server status and management
- `/cost` - Token usage and cost information

### Custom Slash Commands

Create custom commands using markdown files:

```markdown
<!-- .claude/commands/fix-issue.md -->
Please analyze and fix the GitHub issue: $ARGUMENTS.

Follow these steps:
1. Use `gh issue view` to get the issue details
2. Understand the problem described in the issue
3. Search the codebase for relevant files
4. Implement the necessary changes to fix the issue
```

Usage: `/fix-issue 123`

### MCP (Model Context Protocol) Integration

Full MCP server management with OAuth 2.1 support:

```bash
# Add MCP servers through the web UI or CLI
claude mcp add filesystem npx -y @modelcontextprotocol/server-filesystem ~/Projects
claude mcp add github --transport sse https://mcp.example.com/github
```

**Supported Transports:**
- **stdio**: Local command execution
- **sse**: Server-sent events for HTTP streaming
- **streamable-http**: New stateless HTTP transport (2025 spec)

### Session Management

- **Persistent Sessions**: All conversations stored in PostgreSQL
- **Cross-device Access**: Resume sessions from any device
- **Session History**: Browse and search previous conversations
- **Auto-save**: Real-time conversation backup
- **Context Management**: Visual token usage and cost tracking

## Development

### Project Structure

```
ccui/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── chat/              # Chat interface pages
│   └── dashboard/         # Dashboard and management
├── components/            # React components
│   ├── chat/             # Chat interface components
│   ├── mcp/              # MCP management UI
│   └── ui/               # Base UI components
├── lib/                  # Utilities and configurations
│   ├── claude/           # Claude Code integration
│   ├── database/         # Database schemas and queries
│   └── auth/             # Authentication handling
├── docs/                 # Documentation
│   ├── PRD.md           # Product Requirements
│   ├── TRD.md           # Technical Requirements
│   └── CLAUDE_CODE_INTEGRATION_GUIDE.md
└── docker-compose.yml    # Development environment
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/claude_web_ui"
REDIS_URL="redis://localhost:6379"

# Security
ENCRYPTION_KEY="your-32-character-encryption-key"
JWT_SECRET="your-jwt-secret"

# Claude Code
CLAUDE_CODE_PATH="claude"
CLAUDE_PROCESS_TIMEOUT=300000
MAX_CONCURRENT_SESSIONS=100

# Optional: Enterprise
CLAUDE_CODE_USE_BEDROCK=1
CLAUDE_CODE_USE_VERTEX=1
```

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Deployment

### Docker Production

```bash
# Build production image
docker build -t ccui:latest .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup

1. **Database**: PostgreSQL 15+ with required schemas
2. **Redis**: For session caching and real-time features
3. **Claude Code CLI**: Must be installed and accessible
4. **SSL/TLS**: Required for WebSocket connections in production

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use ESLint flat config format
- Write tests for new features
- Update documentation for API changes
- Ensure Claude Code CLI compatibility

## Security

- **API Key Encryption**: All API keys encrypted at rest using AES-256-GCM
- **Process Isolation**: Each session runs in isolated subprocess
- **Permission Management**: Granular tool and resource permissions
- **Enterprise Integration**: Support for AWS IAM and GCP IAM

## Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/ccui/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/ccui/discussions)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Anthropic**: For Claude Code CLI and the Claude models
- **prompt-kit**: For the excellent React chat components
- **MCP Community**: For the Model Context Protocol ecosystem

---

Built with ❤️ for the Claude Code community