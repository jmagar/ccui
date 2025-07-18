import { ClaudeCodeUIError } from './error-types';

export interface ErrorContext {
  sessionId?: string;
  userId?: string;
  operation?: string;
  component?: string;
  timestamp: Date;
  userAgent?: string;
  url?: string;
}

export interface ErrorReport {
  error: ClaudeCodeUIError;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

export class ErrorHandler {
  private errorCallbacks: Array<(report: ErrorReport) => void> = [];
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();

  // Register error callback
  onError(callback: (report: ErrorReport) => void): void {
    this.errorCallbacks.push(callback);
  }

  // Handle different types of errors
  handleError(
    error: Error | ClaudeCodeUIError,
    context: Partial<ErrorContext> = {},
    options: {
      severity?: ErrorReport['severity'];
      recoverable?: boolean;
      rethrow?: boolean;
    } = {}
  ): ErrorReport {
    const claudeError = this.normalizeError(error);
    const fullContext: ErrorContext = {
      timestamp: new Date(),
      ...context,
    };

    const report: ErrorReport = {
      error: claudeError,
      context: fullContext,
      severity: options.severity || this.determineSeverity(claudeError),
      recoverable: options.recoverable ?? this.isRecoverable(claudeError),
    };

    // Track error frequency
    this.trackError(claudeError);

    // Log error
    this.logError(report);

    // Notify callbacks
    this.notifyCallbacks(report);

    // Rethrow if requested
    if (options.rethrow) {
      throw claudeError;
    }

    return report;
  }

  // Handle async operations with error wrapping
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext>,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
      timeout?: number;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries || 0;
    const retryDelay = options?.retryDelay || 1000;
    const timeout = options?.timeout;

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (timeout) {
          return await this.withTimeout(operation(), timeout);
        } else {
          return await operation();
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const report = this.handleError(lastError, {
          ...context,
          operation: context.operation || 'async_operation',
          component: context.component || 'error_handler',
        }, {
          severity: attempt === maxRetries ? 'high' : 'medium',
          recoverable: attempt < maxRetries,
        });

        if (attempt < maxRetries && report.recoverable) {
          console.log(`Retrying operation, attempt ${attempt + 1}/${maxRetries + 1}`);
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }

        throw lastError;
      }
    }

    throw lastError!;
  }

  // Convert any error to ClaudeCodeUIError
  private normalizeError(error: Error | ClaudeCodeUIError): ClaudeCodeUIError {
    if (error instanceof ClaudeCodeUIError) {
      return error;
    }

    // Import error types to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { ValidationError, DatabaseError, NetworkError, SubprocessError } = require('./error-types');

    // Classify common error types
    if (error.message.includes('validation') || error.message.includes('schema')) {
      return new ValidationError(error.message, { originalError: error.name });
    }

    if (error.message.includes('database') || error.message.includes('connection')) {
      return new DatabaseError(error.message, { originalError: error.name });
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new NetworkError(error.message, { originalError: error.name });
    }

    if (error.message.includes('subprocess') || error.message.includes('spawn')) {
      return new SubprocessError(error.message, { originalError: error.name });
    }

    // Default to generic error
    return new ValidationError(`Unhandled error: ${error.message}`, {
      originalError: error.name,
      originalStack: error.stack,
    });
  }

  // Determine error severity
  private determineSeverity(error: ClaudeCodeUIError): ErrorReport['severity'] {
    switch (error.category) {
      case 'database':
        return error.code === 'DATABASE_CONNECTION_ERROR' ? 'critical' : 'high';
      case 'subprocess':
        return error.code === 'SUBPROCESS_SPAWN_ERROR' ? 'critical' : 'high';
      case 'websocket':
        return error.code === 'WEBSOCKET_CONNECTION_ERROR' ? 'medium' : 'low';
      case 'parser':
        return 'medium';
      case 'auth':
        return 'high';
      case 'validation':
        return 'low';
      case 'network':
        return 'medium';
      default:
        return 'medium';
    }
  }

  // Determine if error is recoverable
  private isRecoverable(error: ClaudeCodeUIError): boolean {
    const unrecoverableCodes = [
      'DATABASE_CONNECTION_ERROR',
      'SUBPROCESS_SPAWN_ERROR',
      'TOKEN_VALIDATION_ERROR',
      'SCHEMA_VALIDATION_ERROR',
    ];

    return !unrecoverableCodes.includes(error.code);
  }

  // Track error frequency
  private trackError(error: ClaudeCodeUIError): void {
    const key = `${error.category}:${error.code}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
    this.lastErrors.set(key, new Date());
  }

  // Log error based on severity
  private logError(report: ErrorReport): void {
    const logMessage = `[${report.severity.toUpperCase()}] ${report.error.category}/${report.error.code}: ${report.error.message}`;
    
    switch (report.severity) {
      case 'critical':
        console.error(logMessage, {
          error: report.error.toJSON(),
          context: report.context,
        });
        break;
      case 'high':
        console.error(logMessage, report.context);
        break;
      case 'medium':
        console.warn(logMessage, report.context);
        break;
      case 'low':
        console.log(logMessage);
        break;
    }
  }

  // Notify error callbacks
  private notifyCallbacks(report: ErrorReport): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(report);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    }
  }

  // Utility methods
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get error statistics
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    recentErrors: Array<{ key: string; count: number; lastOccurred: Date }>;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const errorsByCategory: Record<string, number> = {};
    for (const [key, count] of this.errorCounts.entries()) {
      const category = key.split(':')[0];
      if (category) {
        errorsByCategory[category] = (errorsByCategory[category] || 0) + count;
      }
    }

    const recentErrors = Array.from(this.errorCounts.entries())
      .map(([key, count]) => ({
        key,
        count,
        lastOccurred: this.lastErrors.get(key)!,
      }))
      .sort((a, b) => b.lastOccurred.getTime() - a.lastOccurred.getTime())
      .slice(0, 10);

    return {
      totalErrors,
      errorsByCategory,
      recentErrors,
    };
  }

  // Clear error statistics
  clearStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

// Global error handlers
if (typeof window !== 'undefined') {
  // Browser environment
  window.addEventListener('error', (event) => {
    errorHandler.handleError(new Error(event.message), {
      component: 'global_error_handler',
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      {
        component: 'unhandled_rejection',
        url: window.location.href,
        userAgent: navigator.userAgent,
      }
    );
  });
} else {
  // Node.js environment
  process.on('uncaughtException', (error) => {
    errorHandler.handleError(error, {
      component: 'uncaught_exception',
    }, {
      severity: 'critical',
      rethrow: true,
    });
  });

  process.on('unhandledRejection', (reason) => {
    errorHandler.handleError(
      reason instanceof Error ? reason : new Error(String(reason)),
      {
        component: 'unhandled_rejection',
      },
      {
        severity: 'high',
      }
    );
  });
}