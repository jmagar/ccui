import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Claude Code Web UI
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
          A comprehensive web-based frontend for Anthropic's Claude Code CLI, 
          providing full feature parity through a modern, intuitive interface.
        </p>
        
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/chat">
            <Button size="lg">
              Start Chatting
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg">
              View Dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-lg bg-blue-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Real-time Chat</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              WebSocket-based streaming responses with full Claude Code CLI compatibility
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-lg bg-green-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Session Management</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Persistent sessions with cross-device access and conversation history
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-lg bg-purple-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">MCP Integration</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Complete Model Context Protocol server management with OAuth 2.1 support
            </p>
          </div>
        </div>

        <div className="mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>
            Powered by Next.js 15, React 19, and the Claude Code CLI
          </p>
        </div>
      </div>
    </div>
  );
}