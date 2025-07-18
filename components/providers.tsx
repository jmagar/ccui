'use client';

import { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toaster';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ToastProvider>
      {/* Theme and auth providers will be added here when implemented */}
      {children}
    </ToastProvider>
  );
}