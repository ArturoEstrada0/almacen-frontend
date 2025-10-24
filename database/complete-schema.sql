-- =====================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN - ESQUEMA COMPLETO
-- Incluye módulos: Productos, Stock, Almacenes, 
-- Productores, Proveedores, Órdenes de Compra
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- TABLAS DE CONFIGURACIÓN
-- =====================================================

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('zone', 'aisle', 'rack', 'shelf')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, code)
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(20) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('weight', 'volume', 'length', 'unit')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS DE PRODUCTOS
-- =====================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('insumo', 'fruta')),
    category_id UUID REFERENCES categories(id),
    unit_id UUID NOT NULL REFERENCES units(id),
    barcode VARCHAR(100) UNIQUE,
    image_url TEXT,
    cost_price DECIMAL(15,2) DEFAULT 0,
    sale_price DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS DE INVENTARIO
-- =====================================================

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    quantity_available DECIMAL(15,3) NOT NULL DEFAULT 0,
    quantity_reserved DECIMAL(15,3) DEFAULT 0,
    min_stock DECIMAL(15,3) DEFAULT 0,
    max_stock DECIMAL(15,3),
    reorder_point DECIMAL(15,3),
    lot_number VARCHAR(100),
    last_movement_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id, location_id, lot_number)
);

CREATE TABLE movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movement_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('entrada', 'salida', 'ajuste', 'traspaso')),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    location_id UUID REFERENCES locations(id),
    movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_type VARCHAR(50),
    reference_id UUID,
    reference_number VARCHAR(100),
    status VARCHAR(50) CHECK (status IN ('completado', 'cancelado')) DEFAULT 'completado',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movement_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movement_id UUID NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(15,3) NOT NULL,
    unit_id UUID NOT NULL REFERENCES units(id),
    from_location_id UUID REFERENCES locations(id),
    to_location_id UUID REFERENCES locations(id),
    lot_number VARCHAR(100),
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS DE PROVEEDORES
-- =====================================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    rfc VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'México',
    business_type VARCHAR(100),
    payment_terms_days INTEGER DEFAULT 0,
    contact_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_sku VARCHAR(100),
    supplier_price DECIMAL(15,2) NOT NULL,
    lead_time_days INTEGER,
    min_order_quantity DECIMAL(15,3),
    is_preferred BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, supplier_id)
);

CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('borrador', 'enviada', 'respondida', 'ganadora', 'rechazada', 'expirada')),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(15,3) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotation_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    response_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    delivery_days INTEGER,
    payment_terms TEXT,
    notes TEXT,
    is_winner BOOLEAN DEFAULT false,
    purchase_order_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotation_response_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_response_id UUID NOT NULL REFERENCES quotation_responses(id) ON DELETE CASCADE,
    quotation_item_id UUID NOT NULL REFERENCES quotation_items(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    tax DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    availability BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS DE ÓRDENES DE COMPRA
-- =====================================================

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    quotation_response_id UUID REFERENCES quotation_responses(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    delivery_date DATE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pendiente', 'parcial', 'completada', 'cancelada')),
    payment_status VARCHAR(50) CHECK (payment_status IN ('pendiente', 'pagado', 'vencido', 'parcial')),
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    credit_days INTEGER DEFAULT 0,
    due_date DATE,
    invoice_number VARCHAR(100),
    invoice_date DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity_ordered DECIMAL(15,3) NOT NULL,
    quantity_received DECIMAL(15,3) DEFAULT 0,
    unit_id UUID NOT NULL REFERENCES units(id),
    unit_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    tax DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    lot_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('efectivo', 'transferencia', 'cheque', 'deposito')),
    reference VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS DE PRODUCTORES
-- =====================================================

CREATE TABLE producers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    rfc VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    contact_name VARCHAR(255),
    account_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE input_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_number VARCHAR(50) UNIQUE NOT NULL,
    producer_id UUID NOT NULL REFERENCES producers(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE input_assignment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES input_assignments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    tax DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fruit_receptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reception_number VARCHAR(50) UNIQUE NOT NULL,
    producer_id UUID NOT NULL REFERENCES producers(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    reception_date DATE NOT NULL DEFAULT CURRENT_DATE,
    product_id UUID NOT NULL REFERENCES products(id),
    boxes INTEGER NOT NULL,
    weight_per_box DECIMAL(10,3),
    total_weight DECIMAL(15,3),
    shipment_status VARCHAR(50) CHECK (shipment_status IN ('pendiente', 'embarcada', 'vendida')) DEFAULT 'pendiente',
    shipment_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('embarcada', 'en-transito', 'recibida', 'vendida')),
    total_boxes INTEGER NOT NULL DEFAULT 0,
    carrier VARCHAR(255),
    carrier_contact VARCHAR(100),
    shipment_date DATE,
    arrival_date DATE,
    sale_price DECIMAL(15,2),
    sale_total_amount DECIMAL(15,2),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shipment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    reception_id UUID NOT NULL REFERENCES fruit_receptions(id),
    producer_id UUID NOT NULL REFERENCES producers(id),
    boxes INTEGER NOT NULL,
    sale_amount DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE producer_account_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producer_id UUID NOT NULL REFERENCES producers(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('asignacion', 'recepcion', 'ajuste', 'pago')),
    amount DECIMAL(15,2) NOT NULL,
    balance DECIMAL(15,2) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE producer_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    producer_id UUID NOT NULL REFERENCES producers(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('efectivo', 'transferencia', 'cheque', 'deposito')),
    reference VARCHAR(100),
    evidence_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX idx_movements_date ON movements(movement_date DESC);
CREATE INDEX idx_movements_warehouse ON movements(warehouse_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_producers_active ON producers(is_active);
CREATE INDEX idx_fruit_receptions_producer ON fruit_receptions(producer_id);
CREATE INDEX idx_fruit_receptions_status ON fruit_receptions(shipment_status);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_producer_movements_producer ON producer_account_movements(producer_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_producers_updated_at BEFORE UPDATE ON producers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update inventory when movement items are created
CREATE OR REPLACE FUNCTION update_inventory_from_movement()
RETURNS TRIGGER AS $$
DECLARE
    movement_type VARCHAR(50);
    quantity_change DECIMAL(15,3);
    target_warehouse_id UUID;
BEGIN
    SELECT type, warehouse_id INTO movement_type, target_warehouse_id 
    FROM movements WHERE id = NEW.movement_id;
    
    IF movement_type = 'entrada' THEN
        quantity_change = NEW.quantity;
    ELSIF movement_type = 'salida' THEN
        quantity_change = -NEW.quantity;
    ELSIF movement_type = 'ajuste' THEN
        quantity_change = NEW.quantity;
    ELSE
        quantity_change = 0;
    END IF;
    
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
        target_warehouse_id,
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

-- Trigger to update producer balance
CREATE OR REPLACE FUNCTION update_producer_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE producers
    SET account_balance = account_balance + NEW.amount
    WHERE id = NEW.producer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_producer_balance_trigger
AFTER INSERT ON producer_account_movements
FOR EACH ROW EXECUTE FUNCTION update_producer_balance();

-- Trigger to update shipment total boxes
CREATE OR REPLACE FUNCTION update_shipment_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE shipments
    SET total_boxes = (
        SELECT COALESCE(SUM(boxes), 0)
        FROM shipment_items
        WHERE shipment_id = NEW.shipment_id
    )
    WHERE id = NEW.shipment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shipment_totals_trigger
AFTER INSERT OR UPDATE ON shipment_items
FOR EACH ROW EXECUTE FUNCTION update_shipment_totals();

-- =====================================================
-- DATOS INICIALES
-- =====================================================

INSERT INTO units (code, name, abbreviation, type) VALUES
('UNIT', 'Unidad', 'pza', 'unit'),
('KG', 'Kilogramo', 'kg', 'weight'),
('L', 'Litro', 'L', 'volume'),
('BOX', 'Caja', 'caja', 'unit')
ON CONFLICT (code) DO NOTHING;
