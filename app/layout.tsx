import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { type ReactNode } from 'react';

import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Claude Code Web UI',
  description: 'Comprehensive web-based frontend for Anthropic\'s Claude Code CLI',
  keywords: ['claude-code', 'anthropic', 'ai', 'cli', 'web-ui'],
  authors: [{ name: 'Claude Code Web UI Team' }],
  openGraph: {
    title: 'Claude Code Web UI',
    description: 'Comprehensive web-based frontend for Anthropic\'s Claude Code CLI',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}