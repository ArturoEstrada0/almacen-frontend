'use client';

import * as React from 'react';
import {
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Check,
  Trash2,
  Filter,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNotifications } from '@/components/providers/notification-provider';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationCategory,
} from '@/lib/types/notification';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

const notificationTypeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const notificationTypeColors = {
  info: 'text-blue-500 bg-blue-50 border-blue-200',
  success: 'text-green-500 bg-green-50 border-green-200',
  warning: 'text-yellow-500 bg-yellow-50 border-yellow-200',
  error: 'text-red-500 bg-red-50 border-red-200',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const categoryLabels = {
  system: 'Sistema',
  inventory: 'Inventario',
  purchase_order: 'Órdenes de Compra',
  producer: 'Productores',
  supplier: 'Proveedores',
  user: 'Usuarios',
  report: 'Reportes',
  payment: 'Pagos',
};

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    fetchNotifications,
  } = useNotifications();
  const router = useRouter();

  const [filter, setFilter] = React.useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<NotificationCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<NotificationPriority | 'all'>('all');

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread' && n.read) return false;
      if (filter === 'read' && !n.read) return false;
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;
      return true;
    });
  }, [notifications, filter, categoryFilter, priorityFilter]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Centro de Notificaciones</CardTitle>
              <CardDescription>
                {unreadCount > 0
                  ? `Tienes ${unreadCount} notificación${unreadCount > 1 ? 'es' : ''} sin leer`
                  : 'No tienes notificaciones sin leer'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Marcar todas como leídas
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={deleteAllRead}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar leídas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="all">
                  Todas ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Sin leer ({unreadCount})
                </TabsTrigger>
                <TabsTrigger value="read">
                  Leídas ({notifications.length - unreadCount})
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2 w-full sm:w-auto">
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value={filter} className="mt-0">
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Cargando notificaciones...</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay notificaciones para mostrar</p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => {
                    const Icon = notificationTypeIcons[notification.type];
                    const typeColors = notificationTypeColors[notification.type];

                    return (
                      <Card
                        key={notification.id}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          !notification.read && 'border-l-4 border-l-primary'
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={cn(
                                'p-2 rounded-lg border shrink-0',
                                typeColors
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>

                            <div className="flex-1 space-y-2 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-sm">
                                      {notification.title}
                                    </h4>
                                    {!notification.read && (
                                      <Badge variant="default" className="text-xs">
                                        Nuevo
                                      </Badge>
                                    )}
                                    <Badge
                                      variant="outline"
                                      className={cn('text-xs', priorityColors[notification.priority])}
                                    >
                                      {notification.priority}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {categoryLabels[notification.category]}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {notification.message}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {!notification.read && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(notification.createdAt), {
                                      addSuffix: true,
                                      locale: es,
                                    })}
                                  </span>
                                  {notification.read && notification.readAt && (
                                    <span>
                                      · Leído{' '}
                                      {formatDistanceToNow(new Date(notification.readAt), {
                                        addSuffix: true,
                                        locale: es,
                                      })}
                                    </span>
                                  )}
                                </div>

                                {notification.actionUrl && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs"
                                  >
                                    {notification.actionLabel || 'Ver detalles'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
