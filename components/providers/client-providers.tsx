'use client';

import { AuthProvider } from '@/lib/context/auth-context';
import { ToastProvider } from '@/components/ui/toast-provider';
import { NotificationProvider } from '@/components/providers/notification-provider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        {children}
        <ToastProvider />
      </NotificationProvider>
    </AuthProvider>
  );
}
