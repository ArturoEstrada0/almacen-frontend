-- =====================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN - ESQUEMA POSTGRESQL
-- =====================================================
-- Este esquema incluye todas las tablas, relaciones,
-- índices, triggers y funciones necesarias para un
-- sistema completo de gestión de almacén empresarial
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas de texto

-- =====================================================
-- TABLAS DE CONFIGURACIÓN Y CATÁLOGOS
-- =====================================================

-- Tabla de usuarios del sistema
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de almacenes
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'México',
    phone VARCHAR(50),
    manager_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    capacity_m3 DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de ubicaciones dentro de almacenes (zonas, pasillos, estantes)
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('zone', 'aisle', 'rack', 'shelf', 'bin')),
    parent_location_id UUID REFERENCES locations(id),
    capacity_units INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, code)
);

-- Tabla de categorías de productos
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES categories(id),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de unidades de medida
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(20) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('weight', 'volume', 'length', 'unit', 'area')),
    base_unit_id UUID REFERENCES units(id),
    conversion_factor DECIMAL(15,6), -- Factor de conversión a la unidad base
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS DE PRODUCTOS
-- =====================================================

-- Tabla principal de productos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id),
    unit_id UUID NOT NULL REFERENCES units(id),
    type VARCHAR(50) CHECK (type IN ('raw_material', 'finished_product', 'semi_finished', 'consumable', 'service')),
    barcode VARCHAR(100) UNIQUE,
    image_url TEXT,
    
    -- Control de stock
    min_stock DECIMAL(15,3) DEFAULT 0,
    max_stock DECIMAL(15,3),
    reorder_point DECIMAL(15,3),
    
    -- Costos y precios
    cost_price DECIMAL(15,2) DEFAULT 0,
    sale_price DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'MXN',
    
    -- Características físicas
    weight DECIMAL(10,3),
    weight_unit_id UUID REFERENCES units(id),
    volume DECIMAL(10,3),
    volume_unit_id UUID REFERENCES units(id),
    
    -- Control de lotes y vencimientos
    requires_lot_control BOOLEAN DEFAULT false,
    requires_expiry_control BOOLEAN DEFAULT false,
    shelf_life_days INTEGER,
    
    -- Equivalencias (para productos que pueden sustituirse)
    equivalent_product_ids UUID[],
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    is_serialized BOOLEAN DEFAULT false,
    
    -- Auditoría
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de lotes de productos
CREATE TABLE product_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    lot_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    warehouse_id UUID REFERENCES warehouses(id),
    location_id UUID REFERENCES locations(id),
    status VARCHAR(50) CHECK (status IN ('available', 'reserved', 'expired', 'quarantine', 'damaged')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, lot_number)
);

-- =====================================================
-- TABLAS DE PROVEEDORES
-- =====================================================

-- Tabla de proveedores
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    tax_id VARCHAR(50) UNIQUE NOT NULL, -- RFC en México
    
    -- Contacto
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    website VARCHAR(255),
    
    -- Dirección
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'México',
    
    -- Información comercial
    business_type VARCHAR(100), -- Giro comercial
    payment_terms_days INTEGER DEFAULT 0,
    credit_limit DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'MXN',
    
    -- Contacto principal
    contact_name VARCHAR(255),
    contact_position VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    
    -- Calificación y estado
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación producto-proveedor
CREATE TABLE product_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_sku VARCHAR(100),
    supplier_name VARCHAR(255), -- Nombre que el proveedor le da al producto
    cost_price DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'MXN',
    lead_time_days INTEGER, -- Tiempo de entrega
    min_order_quantity DECIMAL(15,3),
    is_preferred BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, supplier_id)
);

-- =====================================================
-- TABLAS DE ÓRDENES DE COMPRA
-- =====================================================

-- Tabla de órdenes de compra
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    
    -- Fechas
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Estado
    status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'pending', 'approved', 'sent', 'partial', 'received', 'cancelled')),
    
    -- Montos
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'MXN',
    
    -- Pago
    payment_terms_days INTEGER DEFAULT 0,
    payment_status VARCHAR(50) CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
    paid_amount DECIMAL(15,2) DEFAULT 0,
    due_date DATE,
    
    -- Facturación
    invoice_number VARCHAR(100),
    invoice_date DATE,
    
    -- Notas
    notes TEXT,
    internal_notes TEXT,
    
    -- Auditoría
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    received_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de items de órdenes de compra
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Cantidades
    quantity_ordered DECIMAL(15,3) NOT NULL,
    quantity_received DECIMAL(15,3) DEFAULT 0,
    unit_id UUID NOT NULL REFERENCES units(id),
    
    -- Precios
    unit_price DECIMAL(15,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    
    -- Lote (si aplica)
    lot_number VARCHAR(100),
    expiry_date DATE,
    
    -- Notas
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS DE INVENTARIO
-- =====================================================

-- Tabla de inventario actual (stock por producto/almacén/ubicación)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    
    -- Cantidades
    quantity_available DECIMAL(15,3) NOT NULL DEFAULT 0,
    quantity_reserved DECIMAL(15,3) DEFAULT 0,
    quantity_in_transit DECIMAL(15,3) DEFAULT 0,
    quantity_damaged DECIMAL(15,3) DEFAULT 0,
    
    -- Lote (si aplica)
    lot_number VARCHAR(100),
    
    -- Última actualización
    last_movement_date TIMESTAMP WITH TIME ZONE,
    last_count_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, warehouse_id, location_id, lot_number)
);

-- =====================================================
-- TABLAS DE MOVIMIENTOS
-- =====================================================

-- Tabla de movimientos de inventario
CREATE TABLE movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movement_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('entry', 'exit', 'adjustment', 'transfer', 'return', 'damage', 'production')),
    
    -- Origen y destino
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    location_id UUID REFERENCES locations(id),
    
    -- Fechas
    movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Referencia
    reference_type VARCHAR(50), -- 'purchase_order', 'sale_order', 'transfer', etc.
    reference_id UUID,
    reference_number VARCHAR(100),
    
    -- Estado
    status VARCHAR(50) CHECK (status IN ('draft', 'pending', 'completed', 'cancelled')),
    
    -- Notas
    notes TEXT,
    reason TEXT,
    
    -- Auditoría
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de items de movimientos
CREATE TABLE movement_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movement_id UUID NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Cantidades
    quantity DECIMAL(15,3) NOT NULL,
    unit_id UUID NOT NULL REFERENCES units(id),
    
    -- Ubicación específica
    from_location_id UUID REFERENCES locations(id),
    to_location_id UUID REFERENCES locations(id),
    
    -- Lote
    lot_number VARCHAR(100),
    expiry_date DATE,
    
    -- Costos (para valorización)
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    
    -- Notas
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de traspasos entre almacenes
CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Origen y destino
    from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    
    -- Fechas
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ship_date DATE,
    expected_arrival_date DATE,
    actual_arrival_date DATE,
    
    -- Estado
    status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'pending', 'in_transit', 'received', 'cancelled')),
    
    -- Transporte
    carrier VARCHAR(255),
    tracking_number VARCHAR(100),
    shipping_cost DECIMAL(15,2),
    
    -- Notas
    notes TEXT,
    
    -- Auditoría
    requested_by UUID REFERENCES users(id),
    shipped_by UUID REFERENCES users(id),
    received_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de items de traspasos
CREATE TABLE transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Cantidades
    quantity_requested DECIMAL(15,3) NOT NULL,
    quantity_shipped DECIMAL(15,3) DEFAULT 0,
    quantity_received DECIMAL(15,3) DEFAULT 0,
    unit_id UUID NOT NULL REFERENCES units(id),
    
    -- Lote
    lot_number VARCHAR(100),
    
    -- Notas
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de ajustes de inventario (arqueos)
CREATE TABLE adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adjustment_number VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    
    -- Fechas
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Tipo de ajuste
    type VARCHAR(50) CHECK (type IN ('physical_count', 'damage', 'loss', 'found', 'correction', 'expiry')),
    reason TEXT NOT NULL,
    
    -- Estado
    status VARCHAR(50) CHECK (status IN ('draft', 'pending', 'approved', 'completed', 'cancelled')),
    
    -- Notas
    notes TEXT,
    
    -- Auditoría
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de items de ajustes
CREATE TABLE adjustment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adjustment_id UUID NOT NULL REFERENCES adjustments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    location_id UUID REFERENCES locations(id),
    
    -- Cantidades
    quantity_system DECIMAL(15,3) NOT NULL, -- Cantidad en sistema
    quantity_physical DECIMAL(15,3) NOT NULL, -- Cantidad física contada
    quantity_difference DECIMAL(15,3) NOT NULL, -- Diferencia
    unit_id UUID NOT NULL REFERENCES units(id),
    
    -- Lote
    lot_number VARCHAR(100),
    
    -- Valorización
    unit_cost DECIMAL(15,2),
    total_cost_impact DECIMAL(15,2),
    
    -- Notas
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS DE AUDITORÍA Y NOTIFICACIONES
-- =====================================================

-- Tabla de logs de auditoría
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de notificaciones
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('low_stock', 'expiry_warning', 'order_received', 'transfer_arrived', 'approval_needed', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para búsquedas de texto
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_sku_trgm ON products USING gin (sku gin_trgm_ops);
CREATE INDEX idx_suppliers_name_trgm ON suppliers USING gin (business_name gin_trgm_ops);

-- Índices para productos
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_barcode ON products(barcode);

-- Índices para inventario
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX idx_inventory_location ON inventory(location_id);
CREATE INDEX idx_inventory_composite ON inventory(product_id, warehouse_id);

-- Índices para movimientos
CREATE INDEX idx_movements_date ON movements(movement_date DESC);
CREATE INDEX idx_movements_type ON movements(type);
CREATE INDEX idx_movements_warehouse ON movements(warehouse_id);
CREATE INDEX idx_movements_reference ON movements(reference_type, reference_id);
CREATE INDEX idx_movement_items_product ON movement_items(product_id);

-- Índices para órdenes de compra
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date DESC);
CREATE INDEX idx_purchase_orders_due_date ON purchase_orders(due_date);

-- Índices para lotes
CREATE INDEX idx_product_lots_product ON product_lots(product_id);
CREATE INDEX idx_product_lots_expiry ON product_lots(expiry_date);
CREATE INDEX idx_product_lots_status ON product_lots(status);

-- Índices para auditoría
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Índices para notificaciones
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular totales de orden de compra
CREATE OR REPLACE FUNCTION calculate_purchase_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_orders
    SET 
        subtotal = (
            SELECT COALESCE(SUM(line_total), 0)
            FROM purchase_order_items
            WHERE purchase_order_id = NEW.purchase_order_id
        ),
        total_amount = (
            SELECT COALESCE(SUM(line_total), 0) + COALESCE(tax_amount, 0) - COALESCE(discount_amount, 0) + COALESCE(shipping_cost, 0)
            FROM purchase_order_items
            WHERE purchase_order_id = NEW.purchase_order_id
        )
    WHERE id = NEW.purchase_order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_order_totals
AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
FOR EACH ROW EXECUTE FUNCTION calculate_purchase_order_totals();

-- Función para actualizar inventario después de un movimiento
CREATE OR REPLACE FUNCTION update_inventory_from_movement()
RETURNS TRIGGER AS $$
DECLARE
    movement_type VARCHAR(50);
    quantity_change DECIMAL(15,3);
BEGIN
    -- Obtener el tipo de movimiento
    SELECT type INTO movement_type FROM movements WHERE id = NEW.movement_id;
    
    -- Calcular el cambio de cantidad según el tipo
    IF movement_type IN ('entry', 'return') THEN
        quantity_change = NEW.quantity;
    ELSIF movement_type IN ('exit', 'damage') THEN
        quantity_change = -NEW.quantity;
    ELSIF movement_type = 'adjustment' THEN
        quantity_change = NEW.quantity; -- Ya viene con signo
    ELSE
        quantity_change = 0;
    END IF;
    
    -- Actualizar o insertar en inventario
    INSERT INTO inventory (
        product_id,
        warehouse_id,
        location_id,
        quantity_available,
        lot_number,
        last_movement_date
    )
    VALUES (
        NEW.product_id,
        (SELECT warehouse_id FROM movements WHERE id = NEW.movement_id),
        NEW.to_location_id,
        quantity_change,
        NEW.lot_number,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (product_id, warehouse_id, location_id, lot_number)
    DO UPDATE SET
        quantity_available = inventory.quantity_available + quantity_change,
        last_movement_date = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_after_movement
AFTER INSERT ON movement_items
FOR EACH ROW EXECUTE FUNCTION update_inventory_from_movement();

-- Función para auditoría automática
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar auditoría a tablas críticas
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_inventory AFTER INSERT OR UPDATE OR DELETE ON inventory
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_movements AFTER INSERT OR UPDATE OR DELETE ON movements
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Función para generar notificaciones de stock bajo
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity_available <= (SELECT min_stock FROM products WHERE id = NEW.product_id) THEN
        INSERT INTO notifications (
            type,
            title,
            message,
            priority,
            link
        )
        VALUES (
            'low_stock',
            'Stock Bajo',
            'El producto ' || (SELECT name FROM products WHERE id = NEW.product_id) || ' está por debajo del stock mínimo',
            'high',
            '/inventory?product=' || NEW.product_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_low_stock_trigger
AFTER UPDATE OF quantity_available ON inventory
FOR EACH ROW EXECUTE FUNCTION check_low_stock();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de inventario con información completa
CREATE OR REPLACE VIEW v_inventory_full AS
SELECT 
    i.id,
    i.product_id,
    p.sku,
    p.name AS product_name,
    p.barcode,
    c.name AS category_name,
    i.warehouse_id,
    w.name AS warehouse_name,
    i.location_id,
    l.code AS location_code,
    i.quantity_available,
    i.quantity_reserved,
    i.quantity_in_transit,
    i.quantity_damaged,
    (i.quantity_available + i.quantity_reserved + i.quantity_in_transit) AS quantity_total,
    i.lot_number,
    u.abbreviation AS unit,
    p.min_stock,
    p.max_stock,
    p.cost_price,
    (i.quantity_available * p.cost_price) AS inventory_value,
    CASE 
        WHEN i.quantity_available <= p.min_stock THEN 'low'
        WHEN i.quantity_available >= p.max_stock THEN 'high'
        ELSE 'normal'
    END AS stock_status,
    i.last_movement_date,
    i.last_count_date
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN warehouses w ON i.warehouse_id = w.id
LEFT JOIN locations l ON i.location_id = l.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN units u ON p.unit_id = u.id
WHERE p.is_active = true;

-- Vista de órdenes de compra con totales
CREATE OR REPLACE VIEW v_purchase_orders_summary AS
SELECT 
    po.id,
    po.order_number,
    po.order_date,
    po.expected_delivery_date,
    po.status,
    s.business_name AS supplier_name,
    w.name AS warehouse_name,
    po.total_amount,
    po.currency,
    po.payment_status,
    po.paid_amount,
    (po.total_amount - po.paid_amount) AS balance,
    po.due_date,
    CASE 
        WHEN po.due_date < CURRENT_DATE AND po.payment_status != 'paid' THEN true
        ELSE false
    END AS is_overdue,
    COUNT(poi.id) AS items_count,
    SUM(poi.quantity_ordered) AS total_quantity_ordered,
    SUM(poi.quantity_received) AS total_quantity_received,
    po.created_at
FROM purchase_orders po
JOIN suppliers s ON po.supplier_id = s.id
JOIN warehouses w ON po.warehouse_id = w.id
LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
GROUP BY po.id, s.business_name, w.name;

-- Vista de movimientos con detalles
CREATE OR REPLACE VIEW v_movements_detail AS
SELECT 
    m.id,
    m.movement_number,
    m.type,
    m.movement_date,
    w.name AS warehouse_name,
    l.code AS location_code,
    m.status,
    m.reference_type,
    m.reference_number,
    COUNT(mi.id) AS items_count,
    SUM(mi.quantity) AS total_quantity,
    SUM(mi.total_cost) AS total_value,
    u.name AS created_by_name,
    m.created_at
FROM movements m
JOIN warehouses w ON m.warehouse_id = w.id
LEFT JOIN locations l ON m.location_id = l.id
LEFT JOIN movement_items mi ON m.id = mi.movement_id
LEFT JOIN users u ON m.created_by = u.id
GROUP BY m.id, w.name, l.code, u.name;

-- Vista de productos con stock total
CREATE OR REPLACE VIEW v_products_stock AS
SELECT 
    p.id,
    p.sku,
    p.name,
    p.description,
    c.name AS category_name,
    p.type,
    p.barcode,
    p.min_stock,
    p.max_stock,
    p.cost_price,
    p.sale_price,
    u.abbreviation AS unit,
    COALESCE(SUM(i.quantity_available), 0) AS total_stock,
    COALESCE(SUM(i.quantity_reserved), 0) AS total_reserved,
    COALESCE(SUM(i.quantity_available * p.cost_price), 0) AS total_value,
    COUNT(DISTINCT i.warehouse_id) AS warehouses_count,
    CASE 
        WHEN COALESCE(SUM(i.quantity_available), 0) <= p.min_stock THEN 'low'
        WHEN COALESCE(SUM(i.quantity_available), 0) >= p.max_stock THEN 'high'
        ELSE 'normal'
    END AS stock_status,
    p.is_active
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN units u ON p.unit_id = u.id
GROUP BY p.id, c.name, u.abbreviation;

-- =====================================================
-- FUNCIONES ÚTILES PARA REPORTES
-- =====================================================

-- Función para obtener el valor total del inventario
CREATE OR REPLACE FUNCTION get_inventory_value(p_warehouse_id UUID DEFAULT NULL)
RETURNS DECIMAL(15,2) AS $$
BEGIN
    IF p_warehouse_id IS NULL THEN
        RETURN (
            SELECT COALESCE(SUM(i.quantity_available * p.cost_price), 0)
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE p.is_active = true
        );
    ELSE
        RETURN (
            SELECT COALESCE(SUM(i.quantity_available * p.cost_price), 0)
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.warehouse_id = p_warehouse_id AND p.is_active = true
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener productos con stock bajo
CREATE OR REPLACE FUNCTION get_low_stock_products(p_warehouse_id UUID DEFAULT NULL)
RETURNS TABLE (
    product_id UUID,
    sku VARCHAR,
    product_name VARCHAR,
    current_stock DECIMAL,
    min_stock DECIMAL,
    warehouse_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.sku,
        p.name,
        COALESCE(i.quantity_available, 0),
        p.min_stock,
        w.name
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    LEFT JOIN warehouses w ON i.warehouse_id = w.id
    WHERE p.is_active = true
        AND COALESCE(i.quantity_available, 0) <= p.min_stock
        AND (p_warehouse_id IS NULL OR i.warehouse_id = p_warehouse_id)
    ORDER BY (COALESCE(i.quantity_available, 0) / NULLIF(p.min_stock, 0)) ASC;
END;
$$ LANGUAGE plpgsql;

-- Función para análisis ABC de productos
CREATE OR REPLACE FUNCTION get_abc_analysis(p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
    product_id UUID,
    sku VARCHAR,
    product_name VARCHAR,
    total_movements BIGINT,
    total_value DECIMAL,
    cumulative_percent DECIMAL,
    abc_class VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH movement_values AS (
        SELECT 
            mi.product_id,
            COUNT(*) AS movement_count,
            SUM(mi.quantity * mi.unit_cost) AS total_value
        FROM movement_items mi
        JOIN movements m ON mi.movement_id = m.id
        WHERE m.movement_date BETWEEN p_start_date AND p_end_date
            AND m.status = 'completed'
        GROUP BY mi.product_id
    ),
    ranked_products AS (
        SELECT 
            mv.product_id,
            p.sku,
            p.name,
            mv.movement_count,
            mv.total_value,
            SUM(mv.total_value) OVER (ORDER BY mv.total_value DESC) / 
                SUM(mv.total_value) OVER () * 100 AS cumulative_percent
        FROM movement_values mv
        JOIN products p ON mv.product_id = p.id
    )
    SELECT 
        rp.product_id,
        rp.sku,
        rp.name,
        rp.movement_count,
        rp.total_value,
        rp.cumulative_percent,
        CASE 
            WHEN rp.cumulative_percent <= 80 THEN 'A'
            WHEN rp.cumulative_percent <= 95 THEN 'B'
            ELSE 'C'
        END AS abc_class
    FROM ranked_products rp
    ORDER BY rp.total_value DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATOS INICIALES (SEED DATA)
-- =====================================================

-- Insertar unidades de medida básicas
INSERT INTO units (code, name, abbreviation, type) VALUES
('UNIT', 'Unidad', 'pza', 'unit'),
('KG', 'Kilogramo', 'kg', 'weight'),
('G', 'Gramo', 'g', 'weight'),
('L', 'Litro', 'L', 'volume'),
('ML', 'Mililitro', 'ml', 'volume'),
('M', 'Metro', 'm', 'length'),
('CM', 'Centímetro', 'cm', 'length'),
('M2', 'Metro cuadrado', 'm²', 'area'),
('BOX', 'Caja', 'caja', 'unit'),
('PALLET', 'Pallet', 'pallet', 'unit');

-- Insertar conversiones de unidades
UPDATE units SET base_unit_id = (SELECT id FROM units WHERE code = 'KG'), conversion_factor = 0.001 WHERE code = 'G';
UPDATE units SET base_unit_id = (SELECT id FROM units WHERE code = 'L'), conversion_factor = 0.001 WHERE code = 'ML';
UPDATE units SET base_unit_id = (SELECT id FROM units WHERE code = 'M'), conversion_factor = 0.01 WHERE code = 'CM';

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

COMMENT ON TABLE products IS 'Catálogo maestro de productos con toda su información';
COMMENT ON TABLE inventory IS 'Stock actual de productos por almacén y ubicación';
COMMENT ON TABLE movements IS 'Registro de todos los movimientos de inventario';
COMMENT ON TABLE purchase_orders IS 'Órdenes de compra a proveedores';
COMMENT ON TABLE suppliers IS 'Catálogo de proveedores';
COMMENT ON TABLE warehouses IS 'Catálogo de almacenes';
COMMENT ON TABLE audit_logs IS 'Registro de auditoría de cambios en el sistema';

-- =====================================================
-- FIN DEL ESQUEMA
-- =====================================================
