# Guía de Integración Completa - Sistema de Almacén

## Arquitectura del Sistema

El sistema está dividido en dos partes principales:

### Backend (NestJS)
- **Ubicación**: `/backend`
- **Puerto**: 3001
- **Base de datos**: PostgreSQL
- **ORM**: TypeORM
- **Autenticación**: JWT

### Frontend (Next.js)
- **Ubicación**: `/` (raíz del proyecto)
- **Puerto**: 3000
- **Framework**: Next.js 15 con App Router
- **UI**: shadcn/ui + Tailwind CSS
- **Data Fetching**: SWR

---

## Instalación y Configuración

### 1. Configurar Base de Datos

\`\`\`bash
# Crear base de datos PostgreSQL
createdb almacen_db

# Ejecutar el esquema completo
psql -d almacen_db -f database/complete-schema.sql
\`\`\`

### 2. Configurar Backend (NestJS)

\`\`\`bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Editar .env con tus credenciales:
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_USER=postgres
# DATABASE_PASSWORD=tu_password
# DATABASE_NAME=almacen_db
# JWT_SECRET=tu_secret_key_seguro

# Ejecutar migraciones (si usas TypeORM migrations)
npm run migration:run

# Iniciar servidor de desarrollo
npm run start:dev
\`\`\`

El backend estará disponible en `http://localhost:3001`

### 3. Configurar Frontend (Next.js)

\`\`\`bash
# Desde la raíz del proyecto
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Editar .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Iniciar servidor de desarrollo
npm run dev
\`\`\`

El frontend estará disponible en `http://localhost:3000`

---

## Módulos Implementados

### ✅ Productos
- CRUD completo de productos (insumos y frutas)
- Gestión de categorías y unidades
- Relación con proveedores
- Configuración de stock por almacén

**Endpoints:**
- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Obtener producto
- `POST /api/products` - Crear producto
- `PATCH /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto

### ✅ Almacenes e Inventario
- Gestión de almacenes y ubicaciones
- Control de stock por almacén
- Movimientos de inventario (entradas, salidas, ajustes, traspasos)
- Alertas de stock bajo
- Trazabilidad completa

**Endpoints:**
- `GET /api/warehouses` - Listar almacenes
- `GET /api/inventory/warehouse/:id` - Stock por almacén
- `GET /api/inventory/low-stock` - Productos con stock bajo
- `POST /api/inventory/movements` - Crear movimiento
- `GET /api/inventory/movements` - Historial de movimientos

### ✅ Proveedores
- Directorio de proveedores
- Relación producto-proveedor con precios
- Sistema de cotizaciones
- Envío de correos a proveedores

**Endpoints:**
- `GET /api/suppliers` - Listar proveedores
- `POST /api/suppliers` - Crear proveedor
- `GET /api/quotations` - Listar cotizaciones
- `POST /api/quotations` - Crear cotización
- `POST /api/quotations/:id/responses` - Agregar respuesta

### ✅ Órdenes de Compra
- Creación desde cotizaciones o desde cero
- Recepción de productos (actualiza inventario)
- Cuentas por pagar
- Seguimiento de pagos
- Control de vencimientos

**Endpoints:**
- `GET /api/purchase-orders` - Listar órdenes
- `POST /api/purchase-orders` - Crear orden
- `POST /api/purchase-orders/:id/receive` - Recibir productos
- `POST /api/purchase-orders/:id/payments` - Registrar pago
- `GET /api/purchase-orders/accounts-payable` - Cuentas por pagar

### ✅ Productores
- Directorio de productores
- Asignación de insumos (genera salida de almacén)
- Recepción de fruta (genera entrada a almacén)
- Creación de embarques (agrupa múltiples recepciones)
- Seguimiento de ventas
- Estados de cuenta
- Registro de pagos

**Endpoints:**
- `GET /api/producers` - Listar productores
- `POST /api/producers/input-assignments` - Asignar insumos
- `POST /api/producers/fruit-receptions` - Registrar recepción
- `POST /api/producers/shipments` - Crear embarque
- `PATCH /api/producers/shipments/:id` - Actualizar embarque
- `GET /api/producers/:id/account-statement` - Estado de cuenta
- `POST /api/producers/payments` - Registrar pago

---

## Flujo de Trabajo Completo

### 1. Configuración Inicial
1. Crear almacenes y ubicaciones
2. Crear categorías de productos
3. Registrar proveedores
4. Registrar productores

### 2. Gestión de Productos
1. Crear productos (tipo: insumo o fruta)
2. Asignar proveedores a productos
3. Configurar stock mínimo/máximo por almacén

### 3. Compras a Proveedores
1. Crear cotización con productos necesarios
2. Enviar a proveedores
3. Recibir respuestas de proveedores
4. Seleccionar ganador
5. Generar orden de compra
6. Recibir productos (actualiza inventario)
7. Registrar pagos

### 4. Operaciones con Productores
1. Asignar insumos a productores (genera deuda)
2. Recibir fruta de productores
3. Agrupar recepciones en embarques
4. Actualizar status de embarque
5. Registrar venta (genera crédito a productores)
6. Realizar pagos a productores

### 5. Control de Inventario
1. Monitorear stock en tiempo real
2. Recibir alertas de stock bajo
3. Realizar ajustes de inventario
4. Traspasos entre almacenes
5. Consultar trazabilidad completa

---

## Patrones de Integración Frontend

### Uso de Hooks Personalizados

\`\`\`typescript
// Ejemplo: Listar productos
import { useProducts } from "@/lib/hooks/use-products"

function ProductsList() {
  const { products, isLoading, isError, mutate } = useProducts()

  if (isLoading) return <div>Cargando...</div>
  if (isError) return <div>Error al cargar productos</div>

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  )
}
\`\`\`

### Crear Recursos

\`\`\`typescript
import { createProduct } from "@/lib/hooks/use-products"
import { toast } from "@/lib/utils/toast"

async function handleCreate(data) {
  try {
    await createProduct(data)
    toast.success("Producto creado exitosamente")
    mutate() // Revalidar datos
  } catch (error) {
    toast.error("Error al crear producto")
  }
}
\`\`\`

---

## Seguridad

### Autenticación
- JWT tokens en headers
- Refresh tokens para sesiones largas
- Roles de usuario (admin, manager, operator, viewer)

### Validación
- DTOs con class-validator en backend
- Validación en frontend con zod
- Sanitización de inputs

### Autorización
- Guards de NestJS por rol
- Middleware de autenticación
- Permisos granulares por módulo

---

## Testing

### Backend
\`\`\`bash
cd backend
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run test:cov    # Coverage
\`\`\`

### Frontend
\`\`\`bash
npm run test        # Jest tests
npm run test:e2e    # Playwright E2E
\`\`\`

---

## Despliegue

### Backend
- Recomendado: Railway, Render, o DigitalOcean
- Base de datos: PostgreSQL en Supabase o Railway
- Variables de entorno en producción

### Frontend
- Recomendado: Vercel
- Variables de entorno: `NEXT_PUBLIC_API_URL`

---

## Documentación API

Una vez iniciado el backend, la documentación Swagger está disponible en:
`http://localhost:3001/api/docs`

---

## Soporte y Mantenimiento

### Logs
- Backend: Winston logger en `/backend/logs`
- Frontend: Console logs con prefijo `[v0]`

### Monitoreo
- Health check: `GET /api/health`
- Métricas de base de datos
- Alertas de stock bajo

### Backups
- Backup diario de base de datos
- Exportación de datos en Excel
- Logs de auditoría completos

---

## Próximos Módulos (Pendientes)

- ⏳ Reportes avanzados
- ⏳ Importar/Exportar Excel
- ⏳ Configuración del sistema
- ⏳ Dashboard con gráficas

---

## Contacto y Soporte

Para dudas o problemas, consultar:
- README.md del backend
- README.md del frontend
- Documentación de API en Swagger
