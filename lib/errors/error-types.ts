// Base error class for all Claude Code UI errors
export abstract class ClaudeCodeUIError extends Error {
  abstract readonly code: string;
  abstract readonly category: 'subprocess' | 'websocket' | 'database' | 'parser' | 'auth' | 'validation' | 'network';
  public readonly timestamp: Date;
  public readonly context: Record<string, any> | undefined;

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;
    
    // Ensure stack trace is captured
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}

// Subprocess errors
export class SubprocessError extends ClaudeCodeUIError {
  readonly code = 'SUBPROCESS_ERROR';
  readonly category = 'subprocess' as const;
}

export class SubprocessTimeoutError extends ClaudeCodeUIError {
  readonly code = 'SUBPROCESS_TIMEOUT';
  readonly category = 'subprocess' as const;
}

export class SubprocessSpawnError extends ClaudeCodeUIError {
  readonly code = 'SUBPROCESS_SPAWN_ERROR';
  readonly category = 'subprocess' as const;
}

export class SubprocessKillError extends ClaudeCodeUIError {
  readonly code = 'SUBPROCESS_KILL_ERROR';
  readonly category = 'subprocess' as const;
}

// WebSocket errors
export class WebSocketError extends ClaudeCodeUIError {
  readonly code = 'WEBSOCKET_ERROR';
  readonly category = 'websocket' as const;
}

export class WebSocketConnectionError extends ClaudeCodeUIError {
  readonly code = 'WEBSOCKET_CONNECTION_ERROR';
  readonly category = 'websocket' as const;
}

export class WebSocketAuthError extends ClaudeCodeUIError {
  readonly code = 'WEBSOCKET_AUTH_ERROR';
  readonly category = 'websocket' as const;
}

export class WebSocketMessageError extends ClaudeCodeUIError {
  readonly code = 'WEBSOCKET_MESSAGE_ERROR';
  readonly category = 'websocket' as const;
}

// Database errors
export class DatabaseError extends ClaudeCodeUIError {
  readonly code = 'DATABASE_ERROR';
  readonly category = 'database' as const;
}

export class DatabaseConnectionError extends ClaudeCodeUIError {
  readonly code = 'DATABASE_CONNECTION_ERROR';
  readonly category = 'database' as const;
}

export class SessionNotFoundError extends ClaudeCodeUIError {
  readonly code = 'SESSION_NOT_FOUND';
  readonly category = 'database' as const;
}

export class SessionCreateError extends ClaudeCodeUIError {
  readonly code = 'SESSION_CREATE_ERROR';
  readonly category = 'database' as const;
}

// Parser errors
export class ParserError extends ClaudeCodeUIError {
  readonly code = 'PARSER_ERROR';
  readonly category = 'parser' as const;
}

export class StreamParseError extends ClaudeCodeUIError {
  readonly code = 'STREAM_PARSE_ERROR';
  readonly category = 'parser' as const;
}

export class JsonParseError extends ClaudeCodeUIError {
  readonly code = 'JSON_PARSE_ERROR';
  readonly category = 'parser' as const;
}

// Authentication errors
export class AuthError extends ClaudeCodeUIError {
  readonly code = 'AUTH_ERROR';
  readonly category = 'auth' as const;
}

export class TokenValidationError extends ClaudeCodeUIError {
  readonly code = 'TOKEN_VALIDATION_ERROR';
  readonly category = 'auth' as const;
}

// Validation errors
export class ValidationError extends ClaudeCodeUIError {
  readonly code = 'VALIDATION_ERROR';
  readonly category = 'validation' as const;
}

export class SchemaValidationError extends ClaudeCodeUIError {
  readonly code = 'SCHEMA_VALIDATION_ERROR';
  readonly category = 'validation' as const;
}

// Network errors
export class NetworkError extends ClaudeCodeUIError {
  readonly code = 'NETWORK_ERROR';
  readonly category = 'network' as const;
}

export class RequestTimeoutError extends ClaudeCodeUIError {
  readonly code = 'REQUEST_TIMEOUT';
  readonly category = 'network' as const;
}

// Error factory functions
export function createSubprocessError(message: string, context?: Record<string, any>): SubprocessError {
  return new SubprocessError(message, context);
}

export function createWebSocketError(message: string, context?: Record<string, any>): WebSocketError {
  return new WebSocketError(message, context);
}

export function createDatabaseError(message: string, context?: Record<string, any>): DatabaseError {
  return new DatabaseError(message, context);
}

export function createParserError(message: string, context?: Record<string, any>): ParserError {
  return new ParserError(message, context);
}

export function createValidationError(message: string, context?: Record<string, any>): ValidationError {
  return new ValidationError(message, context);
}