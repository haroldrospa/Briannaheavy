-- Esquema Completo 100% Supabase para Brianna Heavy Equipment

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Administrador', 'Oficina', 'Repuestos');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('Pieza', 'Camión', 'Equipo_Pesado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE item_status AS ENUM ('Disponible', 'Vendido', 'Reservado', 'Alquilado', 'En_Reparacion');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financing_status AS ENUM ('Activo', 'Pagado', 'Vencido', 'Cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_frequency AS ENUM ('Semanal', 'Quincenal', 'Mensual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. USUARIOS Y PERFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    role user_role NOT NULL DEFAULT 'Oficina',
    status TEXT DEFAULT 'Activo',
    password TEXT DEFAULT '123456',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migración segura si la tabla ya existía
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '123456';

-- 3. CLIENTES
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    document_id TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'Activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INVENTARIO (PIEZAS Y EQUIPOS PESADOS)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type product_type NOT NULL,
    brand TEXT,
    model TEXT,
    year INTEGER,
    price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    cost DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status item_status DEFAULT 'Disponible',
    vin TEXT,
    engine_number TEXT,
    chassis_number TEXT,
    mileage_hours DECIMAL(10, 2),
    part_number TEXT,
    barcode TEXT,
    stock INTEGER DEFAULT 1,
    min_stock INTEGER DEFAULT 1,
    location TEXT,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FACTURAS (VENTAS & NCF)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    ncf TEXT,
    ncf_type TEXT,
    customer_name TEXT NOT NULL,
    customer_rnc TEXT,
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'Efectivo',
    cashier_name TEXT DEFAULT 'Sistema',
    status TEXT DEFAULT 'Pagada',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL
);

-- 6. FINANCIAMIENTOS
CREATE TABLE IF NOT EXISTS public.financings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    down_payment DECIMAL(15, 2) NOT NULL,
    financed_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    installments_count INTEGER NOT NULL,
    frequency payment_frequency NOT NULL DEFAULT 'Mensual',
    start_date DATE NOT NULL,
    status financing_status DEFAULT 'Activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financing_id UUID REFERENCES public.financings(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    principal_amount DECIMAL(15, 2) NOT NULL,
    interest_amount DECIMAL(15, 2) NOT NULL,
    paid_amount DECIMAL(15, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'Pendiente',
    paid_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ÓRDENES DE TRABAJO E INSPECCIONES
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_number TEXT UNIQUE NOT NULL,
    truck_name TEXT NOT NULL,
    chassis_number TEXT,
    technician_name TEXT NOT NULL,
    description TEXT NOT NULL,
    labor_cost DECIMAL(15, 2) DEFAULT 0.00,
    parts_cost DECIMAL(15, 2) DEFAULT 0.00,
    total_cost DECIMAL(15, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'En Proceso', -- En Proceso, Completado, Cancelado
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.truck_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number TEXT UNIQUE NOT NULL,
    truck_name TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    mileage_hours DECIMAL(10, 2),
    brakes_ok BOOLEAN DEFAULT true,
    lights_ok BOOLEAN DEFAULT true,
    tires_ok BOOLEAN DEFAULT true,
    engine_ok BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CAJA POS
CREATE TABLE IF NOT EXISTS public.cash_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    opening_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    closing_amount DECIMAL(15, 2) DEFAULT 0.00,
    cash_sales DECIMAL(15, 2) DEFAULT 0.00,
    card_sales DECIMAL(15, 2) DEFAULT 0.00,
    transfer_sales DECIMAL(15, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'Abierto',
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.cash_shifts(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    reason TEXT NOT NULL,
    user_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CONFIGURACIÓN DEL SISTEMA
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR RLS Y CREAR POLÍTICAS PÚBLICAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All Profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Inventory" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Invoice Items" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Financings" ON public.financings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Installments" ON public.installments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Work Orders" ON public.work_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Inspections" ON public.truck_inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Cash Shifts" ON public.cash_shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Cash Movements" ON public.cash_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All System Settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
