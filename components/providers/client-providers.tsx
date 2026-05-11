'use client';

import { AuthProvider } from '@/lib/context/auth-context';
import { NavigationProvider } from '@/lib/context/navigation-context';
import { ToastProvider } from '@/components/ui/toast-provider';
import { NotificationProvider } from '@/components/providers/notification-provider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavigationProvider>
        <NotificationProvider>
          {children}
          <ToastProvider />
        </NotificationProvider>
      </NavigationProvider>
    </AuthProvider>
  );
}
