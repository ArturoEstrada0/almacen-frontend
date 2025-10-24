# Sistema de Gestión de Almacén

Sistema completo y modular de gestión de almacén construido con Next.js 15, TypeScript, Supabase y shadcn/ui.

## Características Principales

### Módulos Implementados

1. **Productos**
   - Gestión completa de productos (Insumos y Frutas)
   - Control de SKU, códigos de barras, categorías
   - Configuración de precios y costos
   - Relación con proveedores

2. **Inventario**
   - Control de stock por almacén y ubicación
   - Stock mínimo, máximo y punto de reorden
   - Alertas de stock bajo
   - Trazabilidad completa de movimientos

3. **Almacenes**
   - Gestión de múltiples almacenes
   - Ubicaciones y zonas dentro de almacenes
   - Traspasos entre almacenes

4. **Proveedores**
   - Directorio completo de proveedores
   - Sistema de cotizaciones
   - Relación producto-proveedor
   - Envío de correos para solicitudes

5. **Órdenes de Compra**
   - Creación desde cotizaciones o desde cero
   - Recepción de productos
   - Cuentas por pagar
   - Control de vencimientos
   - Registro de pagos

6. **Productores**
   - Asignación de insumos (genera deuda)
   - Recepción de fruta (genera crédito)
   - Sistema de embarques agrupados
   - Estados de cuenta completos
   - Registro de pagos con evidencia

## Stack Tecnológico

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS v4, Framer Motion
- **Backend**: Next.js Server Actions, Supabase
- **Base de Datos**: PostgreSQL (Supabase)
- **Data Fetching**: SWR
- **Validación**: Zod, React Hook Form

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
   \`\`\`bash
   npm install
   \`\`\`

3. Configurar variables de entorno:
   - Copiar `.env.example` a `.env.local`
   - Agregar credenciales de Supabase

4. Ejecutar el esquema SQL en Supabase:
   \`\`\`bash
   # Ejecutar database/complete-schema.sql en tu proyecto de Supabase
   \`\`\`

5. Iniciar el servidor de desarrollo:
   \`\`\`bash
   npm run dev
   \`\`\`

## Estructura del Proyecto

\`\`\`
├── app/                      # Páginas y rutas de Next.js
│   ├── dashboard/           # Dashboard principal
│   ├── products/            # Módulo de productos
│   ├── inventory/           # Módulo de inventario
│   ├── suppliers/           # Módulo de proveedores
│   ├── purchase-orders/     # Módulo de órdenes de compra
│   └── producers/           # Módulo de productores
├── components/              # Componentes React
│   ├── ui/                 # Componentes de shadcn/ui
│   ├── layout/             # Layout components (sidebar, header)
│   ├── inventory/          # Componentes de inventario
│   ├── suppliers/          # Componentes de proveedores
│   ├── purchase-orders/    # Componentes de órdenes
│   └── producers/          # Componentes de productores
├── lib/
│   ├── actions/            # Server Actions
│   ├── hooks/              # Custom React Hooks
│   ├── types/              # TypeScript types
│   ├── db/                 # Database configuration
│   └── utils/              # Utilidades
└── database/               # Esquemas SQL

\`\`\`

## Arquitectura

### Backend (Server Actions)

El sistema utiliza Next.js Server Actions para todas las operaciones de backend:

- **Seguridad**: Las operaciones se ejecutan en el servidor
- **Type-safe**: TypeScript end-to-end
- **Optimistic Updates**: Actualizaciones optimistas con SWR
- **Error Handling**: Manejo centralizado de errores

### Base de Datos

Esquema PostgreSQL completo con:

- **Triggers**: Actualización automática de inventario
- **Funciones**: Cálculos de totales y balances
- **Índices**: Optimización de consultas
- **Constraints**: Integridad referencial

### Frontend

- **SWR**: Cache y revalidación automática
- **React Hook Form**: Formularios con validación
- **Framer Motion**: Animaciones fluidas
- **shadcn/ui**: Componentes accesibles y personalizables

## Flujos de Negocio

### Flujo de Compras

1. Crear cotización con productos necesarios
2. Sistema filtra proveedores que surten esos productos
3. Enviar solicitud a proveedores
4. Recibir respuestas y comparar
5. Marcar cotización ganadora
6. Generar orden de compra automáticamente
7. Recibir productos y actualizar inventario
8. Registrar pagos

### Flujo de Productores

1. **Asignación de Insumos**: Se entregan insumos al productor (genera deuda)
2. **Recepción de Fruta**: Productor entrega cajas de fruta (sin precio aún)
3. **Crear Embarque**: Agrupar múltiples recepciones de diferentes productores
4. **Venta**: Al venderse, se asigna precio y se acredita a cada productor
5. **Estado de Cuenta**: Visualizar balance y movimientos
6. **Pago**: Registrar pagos con evidencia

## Buenas Prácticas Implementadas

### Backend
- Server Actions para operaciones seguras
- Validación de datos en servidor
- Transacciones para operaciones complejas
- Manejo de errores consistente
- Logs de auditoría

### Frontend
- Componentes reutilizables y modulares
- Custom hooks para lógica compartida
- Loading states y error boundaries
- Optimistic updates para mejor UX
- Validación en cliente y servidor

### Base de Datos
- Normalización apropiada
- Índices para optimización
- Triggers para automatización
- Constraints para integridad
- Vistas para reportes

## Próximos Módulos

- Reportes avanzados
- Importación/Exportación Excel
- Configuración del sistema
- Dashboard mejorado con gráficas

## Licencia

Propietario - Todos los derechos reservados
\`\`\`

```typescript file="" isHidden
