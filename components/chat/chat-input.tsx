'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Command } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  suggestions?: Array<{ command: string; description: string }>;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = 'Type your message...',
  suggestions = [],
}: ChatInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    if (showSuggestions) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestion(prev => 
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestion(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'Tab':
        case 'Enter':
          if (e.key === 'Tab' || (e.key === 'Enter' && filteredSuggestions.length > 0)) {
            e.preventDefault();
            const suggestion = filteredSuggestions[selectedSuggestion];
            if (suggestion) {
              selectSuggestion(suggestion);
            }
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedSuggestion(0);
          break;
      }
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    
    // Show suggestions for slash commands
    if (newValue.startsWith('/')) {
      setShowSuggestions(true);
      setSelectedSuggestion(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: { command: string; description: string }) => {
    onChange(suggestion.command + ' ');
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  // Filter suggestions based on current input
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.command.toLowerCase().includes(value.toLowerCase())
  );

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="relative">
      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute bottom-full mb-2 w-full bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.command}
              className={`w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors ${
                index === selectedSuggestion ? 'bg-accent text-accent-foreground' : ''
              }`}
              onClick={() => selectSuggestion(suggestion)}
            >
              <div className="flex items-center space-x-2">
                <Command className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{suggestion.command}</div>
                  <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              handleChange(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-lg"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />

          {/* Character/Command Indicator */}
          {value.startsWith('/') && (
            <div className="absolute right-2 top-2 text-xs text-muted-foreground">
              <Command className="h-4 w-4" />
            </div>
          )}
        </div>

        <Button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          size="sm"
          className="h-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Hint Text */}
      <div className="mt-1 text-xs text-muted-foreground">
        {value.startsWith('/') ? (
          <span>Use Tab or Enter to select command, Esc to cancel</span>
        ) : (
          <span>Press Enter to send, Shift+Enter for new line, / for commands</span>
        )}
      </div>
    </div>
  );
}