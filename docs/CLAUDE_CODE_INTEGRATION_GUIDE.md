# Claude Code Integration Guide
## Research-Based Capabilities vs. Recommended Implementation

### Table of Contents
1. [Researched Claude Code Capabilities](#researched-claude-code-capabilities)
2. [Recommended Implementation Architecture](#recommended-implementation-architecture)
3. [Implementation Examples](#implementation-examples)
4. [Research Gaps & Unknowns](#research-gaps--unknowns)

---

## Researched Claude Code Capabilities

*This section contains verified facts from official documentation and community research.*

### Claude Code SDK Facts

**Package & Installation:**
- NPM package: `@anthropic-ai/claude-code` (version 1.0.53+)
- Global installation: `npm install -g @anthropic-ai/claude-code`
- Command: `claude` in terminal

**Programmatic Usage (Confirmed):**
```bash
# Headless mode with JSON output
claude -p "your prompt" --output-format stream-json

# Non-interactive mode
claude --print "your prompt"

# Project-specific execution
claude --project-path /path/to/project

# Tool permissions
claude --allowed-tools "Bash,Edit,Write"
claude --disallowed-tools "Bash(rm *)"

# Model selection
claude --model claude-sonnet-4-20250514
claude --model claude-opus-4
```

**TypeScript SDK (Confirmed):**
```typescript
import { query, type SDKMessage } from "@anthropic-ai/claude-code";

const messages: SDKMessage[] = [];
for await (const message of query({
  prompt: "Write a haiku about foo.py",
  abortController: new AbortController(),
  options: { maxTurns: 3 }
})) {
  messages.push(message);
}
```

### Authentication Methods (Confirmed)

**1. API Key:**
```bash
export ANTHROPIC_API_KEY="sk-your-key-here"
```

**2. Claude Pro/Max Subscriptions:**
```bash
export CLAUDE_USE_MAX=true
# or
export CLAUDE_USE_PRO=true
```

**3. Enterprise (AWS/GCP):**
```bash
export CLAUDE_CODE_USE_BEDROCK=1
# or  
export CLAUDE_CODE_USE_VERTEX=1
```

### Built-in Slash Commands (Confirmed)

**Session Management:**
- `/help` - Show available commands
- `/init` - Initialize project with CLAUDE.md
- `/clear` - Reset conversation history
- `/compact [focus]` - Summarize conversation to save context
- `/memory` - View/edit project memory

**Configuration:**
- `/model <model-name>` - Switch Claude models
- `/permissions` - Interactive permissions management
- `/doctor` - System diagnostics

**Specialized:**
- `/cost` - Token usage and cost information
- `/mcp` - MCP server status and management
- `/install-github-app` - GitHub integration setup
- `/hooks` - Configure automation hooks

### Custom Slash Commands (Confirmed)

**Location & Format:**
- Global: `~/.claude/commands/*.md`
- Project: `.claude/commands/*.md`
- Format: Markdown files with natural language prompts
- Arguments: Use `$ARGUMENTS` placeholder for parameters

**Example (from research):**
```markdown
<!-- .claude/commands/fix-issue.md -->
Please analyze and fix the GitHub issue: $ARGUMENTS.

Follow these steps:
1. Use `gh issue view` to get the issue details
2. Understand the problem described in the issue
3. Search the codebase for relevant files
4. Implement the necessary changes to fix the issue
5. Write and run tests to verify the fix
6. Ensure code passes linting and type checking
7. Create a descriptive commit message
```

Usage: `/fix-issue 123`

### MCP (Model Context Protocol) Commands (Confirmed)

**Core MCP Commands:**
```bash
# Server management
claude mcp add <name> <command> [args...]
claude mcp remove <name>
claude mcp list
claude mcp get <name>

# Configuration methods
claude mcp add-json <name> '<json-config>'
claude mcp add-from-claude-desktop

# Server operation
claude mcp serve  # Run Claude Code as MCP server
claude mcp reset-project-choices

# Transport types
claude mcp add --transport sse <name> <url>
```

**Server Scopes (Confirmed):**
- **Local scope** (default): `.claude/settings.local.json` - personal, git-ignored
- **Project scope**: `.mcp.json` in project root - shared, version controlled  
- **User scope**: `~/.claude/settings.json` - personal, cross-project

**Example MCP Configuration (from research):**
```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "~/Projects"],
      "env": {}
    },
    "github": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {"GITHUB_TOKEN": "your_token"}
    }
  }
}
```

### Settings Hierarchy (Confirmed)

**Configuration Files:**
1. **User/Global**: `~/.claude/settings.json` - applies to all projects
2. **Project Shared**: `.claude/settings.json` - version controlled, team shared
3. **Project Local**: `.claude/settings.local.json` - git-ignored, personal overrides

**Note:** Documentation shows some discrepancy - some sources reference `~/.claude/claude.json` vs `~/.claude/settings.json`

### Hooks System (Confirmed)

**Lifecycle Events:**
- `PreToolUse` - Before Claude executes any tool
- `PostToolUse` - After tool completes successfully  
- `Notification` - When Claude sends notifications
- `Stop` - When Claude attempts to stop
- `SubagentStop` - When subagent attempts to stop

**Tool Matching (from research):**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "prettier --write \"$CLAUDE_FILE_PATHS\""
          }
        ]
      }
    ]
  }
}
```

### Tools & Permissions (Confirmed)

**Available Tools:**
- `Read` - Read file contents
- `Write` - Write/create files
- `Edit` - Edit existing files
- `MultiEdit` - Edit multiple files
- `LS` - List directory contents
- `Glob` - File pattern matching
- `Grep` - Search file contents
- `Bash` - Execute shell commands
- `Task` - Create subagents
- `WebFetch` - Fetch web content
- `WebSearch` - Search the web

**MCP Tools (pattern):**
- `mcp__<server>__<tool>` - e.g., `mcp__filesystem__read_file`

### Output Formats (Confirmed)

**Stream JSON Format:**
```bash
claude -p "hello" --output-format stream-json
```

**Expected Output Structure:**
- Initial `init` system message
- Conversation messages (user/assistant)
- Final `result` system message with stats
- Each message as separate JSON object

---

## Recommended Implementation Architecture

*This section contains my design recommendations - not researched facts.*

### Subprocess Management Strategy

Based on the confirmed CLI capabilities, here's a recommended architecture:

```typescript
// RECOMMENDED: Subprocess wrapper class
class ClaudeCodeProcess {
  private childProcess: ChildProcess;
  private sessionId: string;
  private userId: string;
  
  constructor(config: ProcessConfig) {
    // Spawn claude subprocess with researched CLI args
    this.childProcess = spawn('claude', [
      '--output-format', 'stream-json',
      '--project-path', config.projectPath,
      '--model', config.model,
      '--allowed-tools', config.allowedTools?.join(',')
    ], {
      env: this.buildEnvironment(config),
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
  
  private buildEnvironment(config: ProcessConfig): Record<string, string> {
    const env = { ...process.env };
    
    // Use researched authentication methods
    if (config.useApiKey) {
      env.ANTHROPIC_API_KEY = config.apiKey;
    } else if (config.useClaudeMax) {
      env.CLAUDE_USE_MAX = 'true';
    }
    
    return env;
  }
}
```

### Communication Protocol Design

Based on the confirmed stream-json format:

```typescript
// RECOMMENDED: Message handling based on confirmed output format
interface ClaudeCodeMessage {
  type: 'init' | 'user' | 'assistant' | 'result' | 'system';
  content: string;
  metadata?: {
    tokens?: number;
    cost?: number;
    model?: string;
  };
}

class MessageHandler {
  parseStreamOutput(data: string): ClaudeCodeMessage[] {
    // Parse confirmed JSONL format from --output-format stream-json
    return data.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  }
  
  async sendSlashCommand(process: ClaudeCodeProcess, command: string, args?: string[]): Promise<void> {
    // Use confirmed slash command format
    const fullCommand = args ? `/${command} ${args.join(' ')}` : `/${command}`;
    await this.sendMessage(process, fullCommand);
  }
}
```

### MCP Integration Strategy

Based on confirmed MCP commands:

```typescript
// RECOMMENDED: MCP management using confirmed CLI commands
class MCPManager {
  async addServer(name: string, command: string, args: string[], scope: 'local' | 'project' | 'user' = 'local'): Promise<void> {
    // Execute confirmed claude mcp add command
    const mcpArgs = ['mcp', 'add', name];
    if (scope !== 'local') {
      mcpArgs.push('-s', scope);
    }
    mcpArgs.push('--', command, ...args);
    
    await this.executeClaudeCommand(mcpArgs);
  }
  
  async listServers(): Promise<MCPServer[]> {
    // Execute confirmed claude mcp list command
    const result = await this.executeClaudeCommand(['mcp', 'list']);
    return this.parseMCPList(result);
  }
  
  async removeServer(name: string): Promise<void> {
    // Execute confirmed claude mcp remove command
    await this.executeClaudeCommand(['mcp', 'remove', name]);
  }
}
```

### Authentication Integration

Based on confirmed authentication methods:

```typescript
// RECOMMENDED: Authentication handling using confirmed env vars
class AuthenticationManager {
  setupAuthentication(config: AuthConfig): Record<string, string> {
    const env: Record<string, string> = {};
    
    switch (config.type) {
      case 'api_key':
        env.ANTHROPIC_API_KEY = config.apiKey;
        break;
        
      case 'claude_max':
        env.CLAUDE_USE_MAX = 'true';
        break;
        
      case 'claude_pro':
        env.CLAUDE_USE_PRO = 'true';
        break;
        
      case 'bedrock':
        env.CLAUDE_CODE_USE_BEDROCK = '1';
        break;
        
      case 'vertex':
        env.CLAUDE_CODE_USE_VERTEX = '1';
        break;
    }
    
    return env;
  }
}
```

---

## Implementation Examples

### Basic Process Creation

```typescript
// Using confirmed CLI arguments and TypeScript SDK patterns
import { spawn } from 'child_process';

function createClaudeProcess(sessionConfig: SessionConfig): ChildProcess {
  const args = [
    '--output-format', 'stream-json',  // Confirmed option
    '--project-path', sessionConfig.projectPath,
    '--model', sessionConfig.model || 'claude-sonnet-4-20250514'
  ];
  
  // Add confirmed tool permissions if specified
  if (sessionConfig.allowedTools?.length) {
    args.push('--allowed-tools', sessionConfig.allowedTools.join(','));
  }
  
  const env = {
    ...process.env,
    ANTHROPIC_API_KEY: sessionConfig.apiKey  // Confirmed env var
  };
  
  return spawn('claude', args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
}
```

### Slash Command Execution

```typescript
// Based on confirmed slash command format
async function executeSlashCommand(process: ChildProcess, command: string, args?: string[]): Promise<void> {
  const fullCommand = args?.length ? `/${command} ${args.join(' ')}` : `/${command}`;
  
  // Send to claude subprocess stdin
  process.stdin?.write(fullCommand + '\n');
}

// Examples using confirmed commands
await executeSlashCommand(process, 'model', ['claude-opus-4']);
await executeSlashCommand(process, 'compact', ['focus on recent changes']);
await executeSlashCommand(process, 'init');
await executeSlashCommand(process, 'mcp');
```

### MCP Server Management

```typescript
// Using confirmed claude mcp commands
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class MCPIntegration {
  async addFilesystemServer(directories: string[]): Promise<void> {
    // Confirmed command format
    const command = [
      'claude', 'mcp', 'add', 'filesystem',
      '-s', 'user',  // Confirmed scope option
      '--',
      'npx', '-y', '@modelcontextprotocol/server-filesystem',
      ...directories
    ].join(' ');
    
    await execAsync(command);
  }
  
  async addGitHubServer(token: string): Promise<void> {
    // Confirmed command with environment variable
    const command = [
      'claude', 'mcp', 'add', 'github',
      '-s', 'project',
      '--',
      'env', `GITHUB_TOKEN=${token}`,
      'npx', '-y', '@modelcontextprotocol/server-github'
    ].join(' ');
    
    await execAsync(command);
  }
  
  async listServers(): Promise<string> {
    // Confirmed list command
    const { stdout } = await execAsync('claude mcp list');
    return stdout;
  }
}
```

---

## Research Gaps & Unknowns

*Areas where additional research or experimentation is needed:*

### Unknown/Unclear Technical Details

**1. Stream JSON Output Format:**
- Exact JSON schema for each message type
- How tool calls are represented in the stream
- Error message format and structure
- Token/cost metadata structure

**2. Process Lifecycle:**
- How Claude Code handles graceful shutdown
- Process startup time and readiness detection
- Memory usage patterns and limits
- Cleanup behavior on termination

**3. Authentication Details:**
- How Claude Pro/Max subscription validation works
- Token refresh mechanisms
- Rate limiting behavior and headers
- Error responses for auth failures

**4. MCP Integration Specifics:**
- How MCP server failures are handled
- Tool approval workflow in programmatic mode
- MCP server startup/shutdown timing
- Debug information available for MCP issues

**5. Tool Execution:**
- Exact format of tool call requests/responses
- How user approval is handled in headless mode
- Tool timeout behavior
- Error recovery for failed tool calls

### Recommended Research Actions

1. **Experiment with TypeScript SDK** to understand exact message formats
2. **Test process lifecycle** with subprocess management
3. **Document authentication flows** through testing
4. **Map MCP integration behavior** with various server types
5. **Analyze stream-json output** structure in detail

### Implementation Priorities

Given the research gaps, recommend implementing in this order:

1. **Basic subprocess creation** using confirmed CLI args
2. **Simple message exchange** to understand stream format
3. **Authentication testing** with known methods
4. **Slash command implementation** using confirmed commands
5. **MCP integration** once message formats are understood
6. **Advanced features** like hooks and complex error handling

This approach allows building on confirmed facts while gradually filling in the unknown details through experimentation.
