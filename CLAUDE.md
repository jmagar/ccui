# Claude Code Web UI Project

## Project Overview

This is a comprehensive web-based frontend for Anthropic's Claude Code CLI, providing full feature parity with the terminal interface through a modern Next.js 15 application. The project maintains 100% compatibility by running Claude Code as managed subprocesses.

## Development Context

### Technology Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Backend**: Node.js with TypeScript, PostgreSQL, Redis
- **UI Components**: prompt-kit, TailwindCSS 4
- **Authentication**: Multi-method (API keys, Claude Pro/Max, Enterprise)
- **Integration**: Claude Code CLI subprocess management

### Architecture Pattern
The application uses a subprocess wrapper architecture where:
1. Web UI sends requests to Node.js backend
2. Backend spawns/manages Claude Code CLI processes
3. Real-time communication via WebSocket for streaming responses
4. Session persistence through PostgreSQL database

## Development Guidelines

### Code Standards
- Use TypeScript strict mode throughout
- Follow ESLint 9+ flat config format
- Implement comprehensive error handling for subprocess management
- Maintain security-first approach with API key encryption
- Ensure all features mirror Claude Code CLI behavior exactly

### Key Implementation Areas

#### 1. Process Management (`lib/claude/`)
- Subprocess lifecycle management
- Session mapping (web sessions ↔ Claude sessions)
- Stream-json parsing and message handling
- Process crash recovery and error handling

#### 2. Authentication (`lib/auth/`)
- Multi-method authentication support
- API key encryption using AES-256-GCM
- Enterprise integration (AWS Bedrock, GCP Vertex AI)
- OAuth token handling for Pro/Max users

#### 3. MCP Integration (`lib/mcp/`)
- OAuth 2.1 compliance for remote MCP servers
- Support for stdio, SSE, and streamable-HTTP transports
- Server configuration and status monitoring
- Tool discovery and permission management

#### 4. Chat Interface (`components/chat/`)
- Real-time WebSocket communication
- prompt-kit component integration
- Message streaming and status updates
- Slash command handling and suggestions

### Testing Strategy
- Unit tests for all core business logic
- Integration tests for API endpoints and database operations
- E2E tests for complete user workflows
- Process lifecycle testing for subprocess management

### Security Considerations
- All API keys must be encrypted at rest
- Process isolation for each user session
- Proper input validation and sanitization
- Enterprise-grade security for AWS/GCP integrations

## Development Workflow

### Getting Started
1. Set up development environment with Docker Compose
2. Initialize database with PostgreSQL schema
3. Install Claude Code CLI globally
4. Configure environment variables for authentication

### Feature Development
1. Follow the comprehensive PRD and TRD specifications in `docs/`
2. Implement features incrementally following the phased approach
3. Ensure each feature maintains Claude Code CLI compatibility
4. Add comprehensive tests for new functionality

### Quality Assurance
- Run linting and type checking before commits
- Ensure all tests pass
- Verify subprocess management works correctly
- Test real-time WebSocket communication
- Validate authentication flows

## Project Status

### Current Phase: Pre-Implementation
- ✅ Comprehensive documentation complete
- ✅ Architecture design finalized
- ✅ Technology stack selected
- 🔄 Implementation in progress
- ⏳ Testing infrastructure setup pending
- ⏳ Deployment configuration pending

### Next Steps
1. Initialize Next.js 15 project structure
2. Set up development environment with Docker
3. Implement core subprocess management
4. Build authentication system
5. Create chat interface with prompt-kit
6. Add MCP integration with OAuth 2.1

## Key Files and Documentation

### Documentation (`docs/`)
- `PRD.md` - Product Requirements Document (comprehensive feature specs)
- `TRD.md` - Technical Requirements Document (implementation details)
- `CLAUDE_CODE_INTEGRATION_GUIDE.md` - Research and integration patterns

### Configuration
- Environment variables for database, Redis, and Claude Code
- Docker Compose for development environment
- ESLint and TypeScript configuration
- Testing framework setup

## Important Notes

### Claude Code CLI Dependency
This application requires Claude Code CLI to be installed and properly configured. The web UI acts as a sophisticated wrapper around the CLI, not a replacement.

### Subprocess Architecture Benefits
- Maintains 100% feature parity automatically
- Inherits all Claude Code updates and improvements
- Reduces implementation complexity
- Ensures consistent behavior across interfaces

### Enterprise Readiness
The application is designed for enterprise deployment with support for:
- AWS Bedrock and GCP Vertex AI integration
- Multi-tenant architecture with user isolation
- Comprehensive security and monitoring
- Scalable infrastructure design

---

**Remember**: This project aims to provide the definitive web interface for Claude Code while maintaining complete compatibility with the CLI. Every feature should work exactly as it does in the terminal.