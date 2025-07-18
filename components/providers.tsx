'use client';

import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <div>
      {/* TODO: Add theme provider, auth provider, etc. */}
      {children}
    </div>
  );
}