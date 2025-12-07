// Ejemplo de uso del hook de notificaciones en un componente React

'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/components/providers/notification-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InventoryDashboard() {
  const { notifications, unreadCount, isConnected, markAllAsRead } = useNotifications();

  // Filtrar solo notificaciones de inventario
  const inventoryNotifications = notifications.filter(
    n => n.category === 'inventory' && !n.read
  );

  // Contar notificaciones urgentes
  const urgentNotifications = inventoryNotifications.filter(
    n => n.priority === 'urgent' || n.priority === 'high'
  );

  useEffect(() => {
    // Actualizar título del documento con contador
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Inventario - Sistema de Almacén`;
    } else {
      document.title = 'Inventario - Sistema de Almacén';
    }
  }, [unreadCount]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard de Inventario</h1>
        
        {/* Indicador de conexión WebSocket */}
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Alertas urgentes */}
      {urgentNotifications.length > 0 && (
        <Card className="border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center justify-between">
              <span>⚠️ Alertas Urgentes ({urgentNotifications.length})</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={markAllAsRead}
              >
                Marcar como leídas
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {urgentNotifications.slice(0, 3).map(notification => (
                <li key={notification.id} className="text-sm">
                  <strong>{notification.title}</strong>: {notification.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Resto del contenido del dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total de Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">1,234</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos con Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">
              {inventoryNotifications.filter(n => n.type === 'warning').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificaciones Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-500">
              {inventoryNotifications.length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
