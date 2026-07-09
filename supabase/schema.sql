-- Schema for Brianna Heavy Equipment PWA

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('Administrador', 'Gerente', 'Supervisor', 'Cajero', 'Vendedor', 'Cobrador', 'Contabilidad', 'Almacén');
CREATE TYPE product_type AS ENUM ('Pieza', 'Camión', 'Equipo_Pesado');
CREATE TYPE item_status AS ENUM ('Disponible', 'Vendido', 'Reservado', 'Alquilado', 'En_Reparacion');
CREATE TYPE financing_status AS ENUM ('Activo', 'Pagado', 'Vencido', 'Cancelado');
CREATE TYPE payment_frequency AS ENUM ('Semanal', 'Quincenal', 'Mensual');

-- 2. PROFILES (Extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'Vendedor',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMERS
CREATE TABLE public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    document_id TEXT UNIQUE NOT NULL, -- Cedula/RNC
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INVENTORY (Generic Items Table)
CREATE TABLE public.inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type product_type NOT NULL,
    brand TEXT,
    model TEXT,
    year INTEGER,
    price DECIMAL(15, 2) NOT NULL,
    cost DECIMAL(15, 2) NOT NULL,
    status item_status DEFAULT 'Disponible',
    
    -- Specific to Trucks & Heavy Equipment
    vin TEXT UNIQUE,
    engine_number TEXT,
    chassis_number TEXT,
    mileage_hours DECIMAL(10, 2),
    
    -- Specific to Parts
    part_number TEXT,
    barcode TEXT UNIQUE,
    stock INTEGER DEFAULT 1,
    min_stock INTEGER,
    
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FINANCINGS
CREATE TABLE public.financings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id),
    item_id UUID REFERENCES public.inventory_items(id),
    total_amount DECIMAL(15, 2) NOT NULL,
    down_payment DECIMAL(15, 2) NOT NULL,
    financed_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL, -- e.g. 18.5 for 18.5%
    installments_count INTEGER NOT NULL,
    frequency payment_frequency NOT NULL,
    start_date DATE NOT NULL,
    status financing_status DEFAULT 'Activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INSTALLMENTS (Amortization Schedule)
CREATE TABLE public.installments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    financing_id UUID REFERENCES public.financings(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    principal_amount DECIMAL(15, 2) NOT NULL,
    interest_amount DECIMAL(15, 2) NOT NULL,
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'Pendiente', -- Pendiente, Pagado, En Mora
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up RLS (Row Level Security) - Basic Setup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- Create Policies (Example: Allow authenticated users to read everything)
CREATE POLICY "Allow authenticated read" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON public.customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON public.inventory_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON public.financings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON public.installments FOR SELECT USING (auth.role() = 'authenticated');
