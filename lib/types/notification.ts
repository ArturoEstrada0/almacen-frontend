export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationCategory {
  SYSTEM = 'system',
  INVENTORY = 'inventory',
  PURCHASE_ORDER = 'purchase_order',
  PRODUCER = 'producer',
  SUPPLIER = 'supplier',
  USER = 'user',
  REPORT = 'report',
  PAYMENT = 'payment',
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  userId: string;
  read: boolean;
  readAt: Date | null;
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationQuery {
  type?: NotificationType;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  read?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
