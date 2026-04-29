'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification, NotificationQuery, NotificationResponse } from '@/lib/types/notification';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  loading: boolean;
  fetchNotifications: (query?: NotificationQuery) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/g, '');
  const API_ROOT = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

  const getToken = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    try {
      const { data } = await supabase.auth.getSession();
      const session = (data as any)?.session;
      if (session?.access_token) return session.access_token;
    } catch (e) {
      // ignore and fallback
    }
    return localStorage.getItem('token');
  }, []);

  const fetchNotifications = useCallback(async (query?: NotificationQuery) => {
    setLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (query?.type) params.append('type', query.type);
      if (query?.priority) params.append('priority', query.priority);
      if (query?.category) params.append('category', query.category);
      if (query?.read !== undefined) params.append('read', String(query.read));
      if (query?.page) params.append('page', String(query.page));
      if (query?.limit) params.append('limit', String(query.limit));

      const response = await fetch(`${API_ROOT}/notifications?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
        },
      });

      if (response.ok) {
        const data: NotificationResponse = await response.json();
        setNotifications(data.items ?? []);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.debug('notification-provider: fetchNotifications error', err);
    } finally {
      setLoading(false);
    }
  }, [API_ROOT, getToken]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_ROOT}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (response.ok) {
        const count = await response.json();
        setUnreadCount(typeof count === 'number' ? count : Number(count));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.debug('notification-provider: refreshUnreadCount error', err);
    }
  }, [API_ROOT, getToken]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_ROOT}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date() } : n)));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [API_ROOT, getToken]);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_ROOT}/notifications/mark-all-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date() })));
        setUnreadCount(0);
        toast({
          title: 'Éxito',
          description: 'Todas las notificaciones han sido marcadas como leídas',
        });
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [API_ROOT, getToken, toast]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_ROOT}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        await refreshUnreadCount();
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [API_ROOT, getToken, refreshUnreadCount]);

  const deleteAllRead = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_ROOT}/notifications/read/all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => !n.read));
        toast({ title: 'Éxito', description: 'Notificaciones leídas eliminadas' });
      }
    } catch (err) {
      console.error('Error deleting read notifications:', err);
    }
  }, [API_ROOT, getToken, toast]);

  // Setup WebSocket connection once token is available
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getToken();
        if (!mounted || !token) return;
        const newSocket = io(`${API_BASE_URL}/notifications`, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
          setIsConnected(true);
          newSocket.emit('subscribe');
        });

        newSocket.on('disconnect', () => setIsConnected(false));

        newSocket.on('notification', (notification: Notification) => {
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast({ title: notification.title, description: notification.message, variant: notification.type === 'error' ? 'destructive' : 'default' });
        });

        newSocket.on('notifications:bulk', (items: Notification[]) => {
          setNotifications(prev => [...items, ...prev]);
          setUnreadCount(prev => prev + items.length);
        });

        setSocket(newSocket);
      } catch (err) {
        // ignore socket init errors
        // eslint-disable-next-line no-console
        console.debug('notification-provider: socket init failed', err);
      }
    })();

    return () => {
      mounted = false;
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE_URL]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications({ limit: 50 });
    refreshUnreadCount();
  }, [fetchNotifications, refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllRead,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
}
