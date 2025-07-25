import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { type ReactNode } from 'react';

import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Claude Code Web UI',
  description: 'Comprehensive web-based frontend for Anthropic\'s Claude Code CLI',
  keywords: ['claude-code', 'anthropic', 'ai', 'cli', 'web-ui'],
  authors: [{ name: 'Claude Code Web UI Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Claude Code Web UI',
    description: 'Comprehensive web-based frontend for Anthropic\'s Claude Code CLI',
    type: 'website',
    siteName: 'Claude Code Web UI',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Claude Code Web UI',
    description: 'Comprehensive web-based frontend for Anthropic\'s Claude Code CLI',
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