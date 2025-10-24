-- Producers Module Schema
-- Complete database schema for producer management, fruit reception, shipments, and account statements

-- =====================================================
-- PRODUCERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS producers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    rfc VARCHAR(13),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    contact_name VARCHAR(255) NOT NULL,
    account_balance DECIMAL(15, 2) DEFAULT 0.00, -- Positive = we owe them, Negative = they owe us
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_producers_code ON producers(code);
CREATE INDEX idx_producers_name ON producers(name);
CREATE INDEX idx_producers_is_active ON producers(is_active);

-- =====================================================
-- INPUT ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS input_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_number VARCHAR(50) UNIQUE NOT NULL,
    producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    assignment_date DATE NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax DECIMAL(15, 2) NOT NULL,
    total DECIMAL(15, 2) NOT NULL,
    notes TEXT,
    user_id UUID NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_input_assignments_producer ON input_assignments(producer_id);
CREATE INDEX idx_input_assignments_warehouse ON input_assignments(warehouse_id);
CREATE INDEX idx_input_assignments_date ON input_assignments(assignment_date);
CREATE INDEX idx_input_assignments_number ON input_assignments(assignment_number);

-- =====================================================
-- INPUT ASSIGNMENT ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS input_assignment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES input_assignments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(15, 3) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax DECIMAL(15, 2) NOT NULL,
    total DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_input_assignment_items_assignment ON input_assignment_items(assignment_id);
CREATE INDEX idx_input_assignment_items_product ON input_assignment_items(product_id);

-- =====================================================
-- FRUIT RECEPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS fruit_receptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reception_number VARCHAR(50) UNIQUE NOT NULL,
    producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    reception_date DATE NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    boxes INTEGER NOT NULL,
    weight_per_box DECIMAL(10, 2),
    total_weight DECIMAL(15, 2),
    price_per_unit DECIMAL(15, 2), -- Pending/estimated price
    estimated_total DECIMAL(15, 2),
    final_price DECIMAL(15, 2), -- Final confirmed price
    final_total DECIMAL(15, 2), -- Final confirmed total
    notes TEXT,
    user_id UUID NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fruit_receptions_producer ON fruit_receptions(producer_id);
CREATE INDEX idx_fruit_receptions_warehouse ON fruit_receptions(warehouse_id);
CREATE INDEX idx_fruit_receptions_product ON fruit_receptions(product_id);
CREATE INDEX idx_fruit_receptions_date ON fruit_receptions(reception_date);
CREATE INDEX idx_fruit_receptions_number ON fruit_receptions(reception_number);

-- =====================================================
-- SHIPMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_number VARCHAR(50) UNIQUE NOT NULL,
    reception_id UUID NOT NULL REFERENCES fruit_receptions(id) ON DELETE RESTRICT,
    producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('embarcada', 'en-transito', 'recibida', 'vendida')),
    boxes INTEGER NOT NULL,
    carrier VARCHAR(255),
    carrier_contact VARCHAR(100),
    shipment_date DATE,
    arrival_date DATE,
    sale_price DECIMAL(15, 2), -- Price per box when sold
    sale_total DECIMAL(15, 2), -- Total sale amount
    notes TEXT,
    user_id UUID NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_reception ON shipments(reception_id);
CREATE INDEX idx_shipments_producer ON shipments(producer_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_number ON shipments(shipment_number);
CREATE INDEX idx_shipments_date ON shipments(shipment_date);

-- =====================================================
-- PRODUCER ACCOUNT MOVEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS producer_account_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('asignacion', 'recepcion', 'ajuste', 'pago')),
    amount DECIMAL(15, 2) NOT NULL, -- Positive = in favor, Negative = against
    balance DECIMAL(15, 2) NOT NULL, -- Running balance after this movement
    reference_type VARCHAR(50) NOT NULL, -- 'assignment', 'reception', 'shipment', 'payment'
    reference_id UUID NOT NULL,
    reference_number VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    user_id UUID NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_producer_movements_producer ON producer_account_movements(producer_id);
CREATE INDEX idx_producer_movements_type ON producer_account_movements(type);
CREATE INDEX idx_producer_movements_date ON producer_account_movements(date);
CREATE INDEX idx_producer_movements_reference ON producer_account_movements(reference_type, reference_id);

-- =====================================================
-- PRODUCER PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS producer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('efectivo', 'transferencia', 'cheque', 'deposito')),
    reference VARCHAR(255), -- Check number, transfer reference, etc.
    evidence_url TEXT, -- Receipt or proof of payment
    notes TEXT,
    user_id UUID NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_producer_payments_producer ON producer_payments(producer_id);
CREATE INDEX idx_producer_payments_date ON producer_payments(payment_date);
CREATE INDEX idx_producer_payments_number ON producer_payments(payment_number);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC ACCOUNT MOVEMENTS
-- =====================================================

-- Trigger: Create account movement when input assignment is created
CREATE OR REPLACE FUNCTION create_assignment_movement()
RETURNS TRIGGER AS $$
DECLARE
    new_balance DECIMAL(15, 2);
BEGIN
    -- Get current balance
    SELECT account_balance INTO new_balance
    FROM producers
    WHERE id = NEW.producer_id;
    
    -- Calculate new balance (assignment is negative - producer owes us)
    new_balance := new_balance - NEW.total;
    
    -- Update producer balance
    UPDATE producers
    SET account_balance = new_balance,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.producer_id;
    
    -- Create account movement
    INSERT INTO producer_account_movements (
        producer_id, type, amount, balance,
        reference_type, reference_id, reference_number,
        description, date, user_id, user_name
    ) VALUES (
        NEW.producer_id, 'asignacion', -NEW.total, new_balance,
        'assignment', NEW.id, NEW.assignment_number,
        'Asignación de insumos ' || NEW.assignment_number,
        NEW.assignment_date, NEW.user_id, NEW.user_name
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assignment_movement
AFTER INSERT ON input_assignments
FOR EACH ROW
EXECUTE FUNCTION create_assignment_movement();

-- Trigger: Create account movement when fruit reception is created
CREATE OR REPLACE FUNCTION create_reception_movement()
RETURNS TRIGGER AS $$
DECLARE
    new_balance DECIMAL(15, 2);
    movement_amount DECIMAL(15, 2);
BEGIN
    -- Use final total if available, otherwise estimated
    movement_amount := COALESCE(NEW.final_total, NEW.estimated_total, 0);
    
    -- Get current balance
    SELECT account_balance INTO new_balance
    FROM producers
    WHERE id = NEW.producer_id;
    
    -- Calculate new balance (reception is positive - we owe producer)
    new_balance := new_balance + movement_amount;
    
    -- Update producer balance
    UPDATE producers
    SET account_balance = new_balance,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.producer_id;
    
    -- Create account movement
    INSERT INTO producer_account_movements (
        producer_id, type, amount, balance,
        reference_type, reference_id, reference_number,
        description, date, user_id, user_name
    ) VALUES (
        NEW.producer_id, 'recepcion', movement_amount, new_balance,
        'reception', NEW.id, NEW.reception_number,
        'Recepción de fruta ' || NEW.reception_number || ' - ' || NEW.boxes || ' cajas',
        NEW.reception_date, NEW.user_id, NEW.user_name
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reception_movement
AFTER INSERT ON fruit_receptions
FOR EACH ROW
EXECUTE FUNCTION create_reception_movement();

-- Trigger: Create adjustment movement when shipment is sold
CREATE OR REPLACE FUNCTION create_shipment_sale_adjustment()
RETURNS TRIGGER AS $$
DECLARE
    new_balance DECIMAL(15, 2);
    adjustment_amount DECIMAL(15, 2);
    reception_estimated DECIMAL(15, 2);
BEGIN
    -- Only process if status changed to 'vendida' and sale_total is set
    IF NEW.status = 'vendida' AND NEW.sale_total IS NOT NULL AND 
       (OLD.status IS NULL OR OLD.status != 'vendida') THEN
        
        -- Get the estimated total from the reception
        SELECT COALESCE(estimated_total, 0) INTO reception_estimated
        FROM fruit_receptions
        WHERE id = NEW.reception_id;
        
        -- Calculate adjustment (difference between sale and estimate)
        adjustment_amount := NEW.sale_total - reception_estimated;
        
        IF adjustment_amount != 0 THEN
            -- Get current balance
            SELECT account_balance INTO new_balance
            FROM producers
            WHERE id = NEW.producer_id;
            
            -- Calculate new balance
            new_balance := new_balance + adjustment_amount;
            
            -- Update producer balance
            UPDATE producers
            SET account_balance = new_balance,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.producer_id;
            
            -- Create account movement
            INSERT INTO producer_account_movements (
                producer_id, type, amount, balance,
                reference_type, reference_id, reference_number,
                description, date, user_id, user_name
            ) VALUES (
                NEW.producer_id, 'ajuste', adjustment_amount, new_balance,
                'shipment', NEW.id, NEW.shipment_number,
                'Ajuste por venta de embarque ' || NEW.shipment_number || ' - Precio final $' || NEW.sale_price || '/caja',
                CURRENT_DATE, NEW.user_id, NEW.user_name
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shipment_sale_adjustment
AFTER UPDATE ON shipments
FOR EACH ROW
EXECUTE FUNCTION create_shipment_sale_adjustment();

-- Trigger: Create account movement when payment is made
CREATE OR REPLACE FUNCTION create_payment_movement()
RETURNS TRIGGER AS $$
DECLARE
    new_balance DECIMAL(15, 2);
BEGIN
    -- Get current balance
    SELECT account_balance INTO new_balance
    FROM producers
    WHERE id = NEW.producer_id;
    
    -- Calculate new balance (payment is negative - reduces what we owe)
    new_balance := new_balance - NEW.amount;
    
    -- Update producer balance
    UPDATE producers
    SET account_balance = new_balance,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.producer_id;
    
    -- Create account movement
    INSERT INTO producer_account_movements (
        producer_id, type, amount, balance,
        reference_type, reference_id, reference_number,
        description, date, user_id, user_name
    ) VALUES (
        NEW.producer_id, 'pago', -NEW.amount, new_balance,
        'payment', NEW.id, NEW.payment_number,
        'Pago ' || NEW.payment_number || ' - ' || NEW.payment_method,
        NEW.payment_date, NEW.user_id, NEW.user_name
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_movement
AFTER INSERT ON producer_payments
FOR EACH ROW
EXECUTE FUNCTION create_payment_movement();

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View: Producer account summary
CREATE OR REPLACE VIEW producer_account_summary AS
SELECT 
    p.id,
    p.code,
    p.name,
    p.account_balance,
    COUNT(DISTINCT ia.id) as total_assignments,
    COALESCE(SUM(ia.total), 0) as total_assigned_amount,
    COUNT(DISTINCT fr.id) as total_receptions,
    COALESCE(SUM(COALESCE(fr.final_total, fr.estimated_total)), 0) as total_received_amount,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'vendida') as total_shipments_sold,
    COALESCE(SUM(s.sale_total), 0) as total_sales_amount,
    COUNT(DISTINCT pp.id) as total_payments,
    COALESCE(SUM(pp.amount), 0) as total_paid_amount
FROM producers p
LEFT JOIN input_assignments ia ON p.id = ia.producer_id
LEFT JOIN fruit_receptions fr ON p.id = fr.producer_id
LEFT JOIN shipments s ON p.id = s.producer_id
LEFT JOIN producer_payments pp ON p.id = pp.producer_id
WHERE p.is_active = true
GROUP BY p.id, p.code, p.name, p.account_balance;

-- Comments
COMMENT ON TABLE producers IS 'Producers who deliver fruit and receive inputs';
COMMENT ON TABLE input_assignments IS 'Assignments of inputs (fertilizers, tools, etc.) to producers';
COMMENT ON TABLE fruit_receptions IS 'Receptions of fruit delivered by producers';
COMMENT ON TABLE shipments IS 'Shipments of fruit to buyers with tracking';
COMMENT ON TABLE producer_account_movements IS 'Complete history of account movements for each producer';
COMMENT ON TABLE producer_payments IS 'Payments made to producers';
COMMENT ON VIEW producer_account_summary IS 'Summary of producer accounts with totals';
