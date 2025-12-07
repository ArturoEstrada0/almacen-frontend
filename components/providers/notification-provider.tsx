'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification, NotificationQuery, NotificationResponse } from '@/lib/types/notification';
import { useToast } from '@/hooks/use-toast';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Get auth token
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (query?: NotificationQuery) => {
    try {
      setLoading(true);
      const token = getToken();
      const params = new URLSearchParams();
      
      if (query?.type) params.append('type', query.type);
      if (query?.priority) params.append('priority', query.priority);
      if (query?.category) params.append('category', query.category);
      if (query?.read !== undefined) params.append('read', String(query.read));
      if (query?.page) params.append('page', String(query.page));
      if (query?.limit) params.append('limit', String(query.limit));

      const response = await fetch(`${API_URL}/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: NotificationResponse = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // Fetch unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const count = await response.json();
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [API_URL]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date() } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [API_URL]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true, readAt: new Date() }))
        );
        setUnreadCount(0);
        toast({
          title: 'Éxito',
          description: 'Todas las notificaciones han sido marcadas como leídas',
        });
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [API_URL, toast]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [API_URL, refreshUnreadCount]);

  // Delete all read notifications
  const deleteAllRead = useCallback(async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/notifications/read/all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => !n.read));
        toast({
          title: 'Éxito',
          description: 'Notificaciones leídas eliminadas',
        });
      }
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  }, [API_URL, toast]);

  // Setup WebSocket connection
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const newSocket = io(`${API_URL}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      newSocket.emit('subscribe');
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('notification', (notification: Notification) => {
      console.log('New notification received:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast notification
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    });

    newSocket.on('notifications:bulk', (notifications: Notification[]) => {
      setNotifications(prev => [...notifications, ...prev]);
      setUnreadCount(prev => prev + notifications.length);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [API_URL, toast]);

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
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
