# Contributing to Claude Code Web UI

Thank you for considering contributing to Claude Code Web UI! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Guidelines](#development-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Claude Code CLI installed globally: `npm install -g @anthropic-ai/claude-code`
- Git

### First-time Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/ccui.git
   cd ccui
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/original-org/ccui.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
6. Start development services:
   ```bash
   docker-compose up -d
   npm run dev
   ```

## Development Setup

### Environment Variables

Configure your `.env.local` file with the following required variables:

```bash
# Database
DATABASE_URL="postgresql://ccui_user:ccui_password@localhost:5432/claude_web_ui"
REDIS_URL="redis://localhost:6379"

# Security (generate secure keys)
ENCRYPTION_KEY="your-32-character-encryption-key"
JWT_SECRET="your-jwt-secret-key"

# Claude Code authentication (choose one)
ANTHROPIC_API_KEY="sk-your-api-key"
# OR
CLAUDE_USE_PRO=true
# OR
CLAUDE_USE_MAX=true
```

### Development Commands

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Linting and formatting
npm run lint
npm run lint:fix
npm run format

# Testing
npm run test
npm run test:watch
npm run test:integration
npm run test:e2e

# Database operations
npm run db:generate
npm run db:migrate
npm run db:studio

# Docker operations
npm run docker:dev
npm run docker:down
```

## Project Structure

```
ccui/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   ├── chat/              # Chat interface pages
│   ├── dashboard/         # Dashboard pages
│   ├── mcp/               # MCP management pages
│   └── settings/          # Settings pages
├── components/            # React components
│   ├── chat/             # Chat-specific components
│   ├── mcp/              # MCP management components
│   └── ui/               # Reusable UI components
├── lib/                  # Utility libraries and configurations
│   ├── claude/           # Claude Code integration
│   ├── database/         # Database schemas and queries
│   ├── auth/             # Authentication handling
│   ├── mcp/              # MCP server management
│   └── utils/            # General utilities
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── tests/                # Test files
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end tests
├── sql/                  # Database migration files
├── docs/                 # Documentation
└── scripts/              # Build and deployment scripts
```

## Development Guidelines

### Code Standards

#### TypeScript
- Use TypeScript strict mode
- Define proper types for all functions and components
- Avoid `any` type unless absolutely necessary
- Use type imports: `import type { Type } from 'module'`

#### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Follow the component file naming convention: `ComponentName.tsx`
- Export components as default exports

#### API Routes
- Follow RESTful conventions
- Implement proper error handling
- Use Zod for request validation
- Include comprehensive JSDoc comments

#### Database
- Use Drizzle ORM for all database operations
- Write migrations for schema changes
- Include proper indexes for performance
- Follow naming conventions: snake_case for database, camelCase for TypeScript

### File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `ChatInterface.tsx`)
- Pages: `kebab-case.tsx` (e.g., `chat-session.tsx`)
- Utilities: `camelCase.ts` (e.g., `processManager.ts`)
- Types: `camelCase.types.ts` (e.g., `session.types.ts`)
- Tests: `*.test.ts` or `*.spec.ts`

### Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(chat): add real-time message streaming
fix(auth): resolve API key encryption issue
docs(readme): update installation instructions
```

### Architecture Principles

#### Subprocess Management
- All Claude Code interactions must go through managed subprocesses
- Implement proper process lifecycle management
- Handle process crashes gracefully
- Maintain session state persistence

#### Security
- Encrypt all API keys at rest using AES-256-GCM
- Implement proper input validation and sanitization
- Use process isolation for user sessions
- Follow enterprise security best practices

#### Performance
- Implement proper caching strategies
- Use WebSocket connections for real-time communication
- Optimize database queries with proper indexing
- Follow Next.js performance best practices

#### Error Handling
- Implement comprehensive error boundaries
- Log errors appropriately without exposing sensitive data
- Provide meaningful error messages to users
- Handle subprocess failures gracefully

## Testing

### Test Types

#### Unit Tests
- Test individual functions and components
- Mock external dependencies
- Focus on business logic and edge cases
- Maintain >80% code coverage

#### Integration Tests
- Test API endpoints and database operations
- Use test databases (Docker containers)
- Test Claude Code subprocess interactions
- Verify end-to-end workflows

#### E2E Tests
- Test complete user workflows
- Use Playwright for browser automation
- Test critical paths and user journeys
- Run against production-like environments

### Running Tests

```bash
# Unit tests
npm run test
npm run test:watch
npm run test:coverage

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
npm run test:e2e:ui

# All tests
npm run test:all
```

### Writing Tests

#### Unit Test Example
```typescript
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '@/components/chat/ChatMessage';

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    render(
      <ChatMessage
        message={{
          id: '1',
          role: 'user',
          content: 'Hello Claude',
          timestamp: new Date(),
        }}
      />
    );
    
    expect(screen.getByText('Hello Claude')).toBeInTheDocument();
  });
});
```

#### Integration Test Example
```typescript
import { POST } from '@/app/api/sessions/route';
import { createMockRequest } from '@/tests/utils';

describe('/api/sessions', () => {
  it('creates new session successfully', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: { projectId: 'test-project' },
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.session.id).toBeDefined();
  });
});
```

## Submitting Changes

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   npm run test:integration
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(component): add new feature"
   ```

5. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Use the PR template
   - Link related issues
   - Add screenshots for UI changes
   - Request review from maintainers

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)
```

### Review Process

1. **Automated Checks**
   - CI pipeline must pass
   - All tests must pass
   - Code coverage requirements met

2. **Code Review**
   - At least one maintainer approval required
   - Address all review comments
   - Ensure code quality standards

3. **Merge**
   - Squash and merge for feature branches
   - Maintain clean commit history

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Incompatible API changes
- **MINOR**: Backward-compatible functionality
- **PATCH**: Backward-compatible bug fixes

### Release Steps

1. **Prepare Release**
   - Update version in `package.json`
   - Update CHANGELOG.md
   - Create release branch

2. **Create Release**
   - Tag with version: `git tag v1.0.0`
   - Push tag: `git push origin v1.0.0`
   - GitHub Actions will handle the rest

3. **Post-Release**
   - Update documentation
   - Announce in relevant channels
   - Monitor for issues

## Getting Help

- **Documentation**: Check the [docs/](./docs/) directory
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community Discord server

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Annual contributor highlights

Thank you for contributing to Claude Code Web UI! 🎉