import { Transform } from 'stream';

import { ClaudeMessage } from '@/types/claude.types';

interface ParsedMessage {
  type: 'message' | 'error' | 'status' | 'result' | 'incomplete';
  data: ClaudeMessage | string | any;
  raw: string;
}

export class StreamJsonParser extends Transform {
  private buffer: string = '';
  private messageCount: number = 0;
  private completionTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly COMPLETION_TIMEOUT_MS = 5000; // 5 seconds
  private readonly disableTimeout: boolean;

  constructor(options: { disableTimeout?: boolean } = {}) {
    super({ 
      objectMode: true,
      readableObjectMode: true,
      writableObjectMode: false 
    });
    this.disableTimeout = options.disableTimeout || process.env.NODE_ENV === 'test';
  }

  override _transform(chunk: Buffer, encoding: string, callback: () => void) {
    this.buffer += chunk.toString();
    this.processBuffer();
    callback();
  }

  override _flush(callback: () => void) {
    // Process any remaining data in buffer
    if (this.buffer.trim()) {
      this.processBuffer(true);
    }
    // Clear any pending timeouts
    this.resetCompletionTimeout();
    callback();
  }

  override _destroy(error: Error | null, callback: (error?: Error | null) => void) {
    // Clean up timeouts when stream is destroyed
    this.resetCompletionTimeout();
    callback(error);
  }

  private processBuffer(isFlush: boolean = false) {
    const lines = this.buffer.split('\n');
    
    // Keep the last incomplete line in buffer unless this is a flush
    if (!isFlush && lines.length > 0) {
      this.buffer = lines.pop() || '';
    } else {
      this.buffer = '';
    }

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        this.parseLine(trimmed);
      }
    }
  }

  private parseLine(line: string) {
    try {
      // Reset completion timeout on any new line
      this.resetCompletionTimeout();

      // Try to parse as JSON
      const parsed = JSON.parse(line);
      
      if (this.isClaudeMessage(parsed)) {
        this.messageCount++;
        
        const message: ParsedMessage = {
          type: 'message',
          data: parsed,
          raw: line
        };

        this.push(message);

        // Set completion timeout after processing a message (unless disabled)
        if (!this.disableTimeout) {
          this.setCompletionTimeout();
        }
      } else {
        // Handle other JSON structures (status, errors, etc.)
        this.handleNonMessage(parsed, line);
      }
    } catch (_error) {
      // Handle non-JSON lines (status messages, errors, etc.)
      this.handleNonJsonLine(line);
    }
  }

  private isClaudeMessage(obj: any): obj is ClaudeMessage {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.type === 'string' &&
      (obj.type === 'user' || obj.type === 'assistant' || obj.type === 'system' || obj.type === 'result') &&
      (obj.message || obj.text || obj.content)
    );
  }

  private handleNonMessage(parsed: any, line: string) {
    let messageType: ParsedMessage['type'] = 'status';
    
    if (parsed.error || parsed.type === 'error') {
      messageType = 'error';
    } else if (parsed.result || parsed.type === 'result') {
      messageType = 'result';
    }

    const message: ParsedMessage = {
      type: messageType,
      data: parsed,
      raw: line
    };

    this.push(message);
  }

  private handleNonJsonLine(line: string) {
    // Handle common Claude Code CLI output patterns
    if (line.includes('Error:') || line.includes('ERROR')) {
      const message: ParsedMessage = {
        type: 'error',
        data: line,
        raw: line
      };
      this.push(message);
    } else if (line.includes('Status:') || line.includes('Processing')) {
      const message: ParsedMessage = {
        type: 'status',
        data: line,
        raw: line
      };
      this.push(message);
    } else if (line.trim()) {
      // Any other non-empty line
      const message: ParsedMessage = {
        type: 'status',
        data: line,
        raw: line
      };
      this.push(message);
    }
  }

  private setCompletionTimeout() {
    this.resetCompletionTimeout();
    
    this.completionTimeout = setTimeout(() => {
      // Only push if stream is still writable
      if (!this.destroyed && !this.readableEnded) {
        const message: ParsedMessage = {
          type: 'incomplete',
          data: {
            reason: 'completion_timeout',
            messageCount: this.messageCount,
            timestamp: new Date().toISOString()
          },
          raw: ''
        };
        
        this.push(message);
      }
    }, this.COMPLETION_TIMEOUT_MS);
  }

  private resetCompletionTimeout() {
    if (this.completionTimeout) {
      clearTimeout(this.completionTimeout);
      this.completionTimeout = null;
    }
  }

  // Public methods for external control
  public getMessageCount(): number {
    return this.messageCount;
  }

  public getBufferSize(): number {
    return this.buffer.length;
  }

  public forceFlush(): void {
    this.processBuffer(true);
  }

  public resetState(): void {
    this.buffer = '';
    this.messageCount = 0;
    this.resetCompletionTimeout();
  }
}

// Utility function to create and configure parser
export function createStreamJsonParser(): StreamJsonParser {
  return new StreamJsonParser();
}

// Factory function with error handling
export function createSafeStreamJsonParser(
  onError?: (error: Error) => void,
  onMessage?: (message: ParsedMessage) => void
): StreamJsonParser {
  const parser = new StreamJsonParser();

  parser.on('error', (error) => {
    console.error('StreamJsonParser error:', error);
    if (onError) {
      onError(error);
    }
  });

  if (onMessage) {
    parser.on('data', onMessage);
  }

  return parser;
}

// Type exports
export type { ParsedMessage };