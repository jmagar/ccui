// Integration test setup for Node.js environment
// This file is specifically for integration tests that run in Node.js

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_claude_code_ui';

// Mock environment variables that might be needed
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Suppress expected test error messages
console.error = (...args) => {
  const message = args[0]?.toString() || '';
  // Suppress expected test errors
  if (message.includes('Test subprocess error') ||
      message.includes('Test parser error') ||
      message.includes('Error 1') ||
      message.includes('Error 2') ||
      message.includes('Error 3') ||
      message.includes('Database connection failed') ||
      message.includes('Operation timed out after 50ms')) {
    return; // Suppress these expected errors
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  // Suppress expected warnings
  if (message.includes('Temporary failure') ||
      message.includes('Warning:')) {
    return; // Suppress these expected warnings
  }
  originalConsoleWarn(...args);
};

console.log = (...args) => {
  const message = args[0]?.toString() || '';
  // Suppress retry messages and expected logs
  if (message.includes('Retrying operation') ||
      message.includes('Test parser error')) {
    return; // Suppress these expected logs
  }
  originalConsoleLog(...args);
};

// Global test timeout
jest.setTimeout(30000);

// Track open streams for cleanup
global.openStreams = new Set();

// Mock timers if needed for tests
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllTimers();
  // Force cleanup any remaining streams
  if (global.openStreams) {
    for (const stream of global.openStreams) {
      if (stream && typeof stream.destroy === 'function') {
        stream.destroy();
      }
    }
    global.openStreams.clear();
  }
});

// Cleanup after all tests
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});