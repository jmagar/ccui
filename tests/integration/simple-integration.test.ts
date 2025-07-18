import { StreamJsonParser } from '@/lib/parsers/stream-json-parser';
import { errorHandler } from '@/lib/errors/error-handler';
import { 
  SubprocessError, 
  WebSocketError, 
  DatabaseError, 
  ValidationError 
} from '@/lib/errors/error-types';

describe('Simple Integration Tests', () => {
  describe('StreamJsonParser', () => {
    it('should parse Claude message stream correctly', (done) => {
      const parser = new StreamJsonParser();
      const testJson = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Hello, World!' }]
        },
        metadata: {
          tokens: 10,
          cost: 0.001
        }
      });

      parser.on('data', (message) => {
        expect(message.type).toBe('message');
        expect(message.data.type).toBe('assistant');
        expect(message.data.message.content[0].text).toBe('Hello, World!');
        parser.destroy(); // Clean up
        done();
      });

      parser.write(testJson + '\n');
      parser.end();
    });

    it('should handle malformed JSON gracefully', (done) => {
      const parser = new StreamJsonParser();
      const invalidJson = '{ invalid json }';
      
      parser.on('data', (message) => {
        expect(message.type).toBe('status');
        expect(typeof message.data).toBe('string');
        parser.destroy(); // Clean up
        done();
      });

      parser.write(invalidJson + '\n');
      parser.end();
    });

    it('should track message count correctly', () => {
      const parser = new StreamJsonParser();
      expect(parser.getMessageCount()).toBe(0);
      
      const testJson = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Test' }] }
      });

      parser.write(testJson + '\n');
      parser.write(testJson + '\n');
      parser.end();

      expect(parser.getMessageCount()).toBe(2);
      parser.destroy(); // Clean up
    });

    it('should handle reset state correctly', () => {
      const parser = new StreamJsonParser();
      const testJson = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Test' }] }
      });

      parser.write(testJson + '\n');
      expect(parser.getMessageCount()).toBe(1);
      expect(parser.getBufferSize()).toBeGreaterThanOrEqual(0);

      parser.resetState();
      expect(parser.getMessageCount()).toBe(0);
      expect(parser.getBufferSize()).toBe(0);
      parser.destroy(); // Clean up
    });
  });

  describe('Error Handling System', () => {
    beforeEach(() => {
      errorHandler.clearStats();
    });

    it('should categorize different error types correctly', () => {
      const subprocessError = new SubprocessError('Process failed', { pid: 123 });
      const webSocketError = new WebSocketError('Connection lost');
      const databaseError = new DatabaseError('Query failed');
      const validationError = new ValidationError('Invalid input');

      expect(subprocessError.category).toBe('subprocess');
      expect(subprocessError.code).toBe('SUBPROCESS_ERROR');
      
      expect(webSocketError.category).toBe('websocket');
      expect(webSocketError.code).toBe('WEBSOCKET_ERROR');
      
      expect(databaseError.category).toBe('database');
      expect(databaseError.code).toBe('DATABASE_ERROR');
      
      expect(validationError.category).toBe('validation');
      expect(validationError.code).toBe('VALIDATION_ERROR');
    });

    it('should handle errors and generate reports', () => {
      const testError = new SubprocessError('Test subprocess error');
      
      const report = errorHandler.handleError(testError, {
        sessionId: 'test_session_123',
        operation: 'send_message',
      });

      expect(report.error).toBe(testError);
      expect(report.context.sessionId).toBe('test_session_123');
      expect(report.context.operation).toBe('send_message');
      expect(report.severity).toBe('high');
      expect(report.recoverable).toBe(true);
    });

    it('should retry operations on recoverable errors', async () => {
      let attemptCount = 0;
      
      const flakyOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await errorHandler.withErrorHandling(
        flakyOperation,
        { operation: 'flaky_test' },
        { maxRetries: 3, retryDelay: 10 }
      );

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('should track error statistics', () => {
      const error1 = new SubprocessError('Error 1');
      const error2 = new WebSocketError('Error 2');
      const error3 = new SubprocessError('Error 3');

      errorHandler.handleError(error1, { operation: 'test1' });
      errorHandler.handleError(error2, { operation: 'test2' });
      errorHandler.handleError(error3, { operation: 'test3' });

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCategory.subprocess).toBe(2);
      expect(stats.errorsByCategory.websocket).toBe(1);
      expect(stats.recentErrors.length).toBe(2); // 2 unique error codes
    });

    it('should normalize regular errors to ClaudeCodeUI errors', () => {
      const regularError = new Error('Database connection failed');
      
      const report = errorHandler.handleError(regularError, {
        operation: 'database_query',
      });

      expect(report.error.category).toBe('database');
      expect(report.error.message).toContain('Database connection failed');
    });

    it('should handle timeout operations', async () => {
      const slowOperation = async () => {
        return new Promise(resolve => setTimeout(() => resolve('done'), 200));
      };

      await expect(
        errorHandler.withErrorHandling(
          slowOperation,
          { operation: 'timeout_test' },
          { timeout: 50 }
        )
      ).rejects.toThrow('Operation timed out after 50ms');
    });
  });

  describe('Error Type Serialization', () => {
    it('should serialize errors to JSON correctly', () => {
      const error = new SubprocessError('Test error', {
        sessionId: 'test_123',
        command: 'claude --help'
      });

      const json = error.toJSON();

      expect(json.name).toBe('SubprocessError');
      expect(json.code).toBe('SUBPROCESS_ERROR');
      expect(json.category).toBe('subprocess');
      expect(json.message).toBe('Test error');
      expect(json.context.sessionId).toBe('test_123');
      expect(json.context.command).toBe('claude --help');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('Component Integration', () => {
    it('should integrate parser with error handler', (done) => {
      const parser = new StreamJsonParser();
      let errorCaught = false;

      // Setup error handler to catch parser errors
      errorHandler.onError((report) => {
        if (report.error.message.includes('Test parser error')) {
          errorCaught = true;
          expect(errorCaught).toBe(true);
          parser.destroy(); // Clean up parser
          done();
        }
      });

      parser.on('error', (error) => {
        errorHandler.handleError(error, {
          component: 'stream_parser',
          operation: 'parse_message',
        });
      });

      parser.on('data', (message) => {
        expect(message).toBeDefined();
        
        // Force an error for testing after a short delay to ensure setup is complete
        setImmediate(() => {
          parser.emit('error', new Error('Test parser error'));
        });
      });

      parser.write(JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Test' }] }
      }) + '\n');
    });
  });

  describe('Utility Functions', () => {
    it('should create parsers using factory functions', () => {
      const parser1 = new StreamJsonParser();
      expect(parser1).toBeInstanceOf(StreamJsonParser);

      let errorHandlerCalled = false;
      let messageHandlerCalled = false;

      const parser2 = new StreamJsonParser();
      
      parser2.on('error', () => {
        errorHandlerCalled = true;
      });

      parser2.on('data', () => {
        messageHandlerCalled = true;
      });

      // Test with valid message
      parser2.write(JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Test' }] }
      }) + '\n');
      
      // Clean up parsers
      parser1.destroy();
      parser2.destroy();

      expect(messageHandlerCalled).toBe(true);
    });
  });
});

// Test environment check
describe('Test Environment', () => {
  it('should have correct Node.js environment', () => {
    expect(process.env.NODE_ENV).toBeDefined();
    expect(typeof global).toBe('object');
  });

  it('should load TypeScript modules correctly', () => {
    expect(StreamJsonParser).toBeDefined();
    expect(errorHandler).toBeDefined();
    expect(SubprocessError).toBeDefined();
  });
});