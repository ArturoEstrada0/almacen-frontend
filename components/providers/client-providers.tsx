'use client';

import { AuthProvider } from '@/lib/context/auth-context';
import { ToastProvider } from '@/components/ui/toast-provider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ToastProvider />
    </AuthProvider>
  );
}
