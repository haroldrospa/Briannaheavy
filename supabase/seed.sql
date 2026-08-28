-- Seed Data for Brianna Heavy Equipment (Dominican Republic Context)

-- 1. CLIENTES
INSERT INTO public.customers (name, document_id, email, phone, address) VALUES
('Construcciones & Maquinarias del Caribe SRL', '101-54321-8', 'ventas@construcaribe.do', '809-555-0192', 'Av. Luperón #45, Santo Domingo'),
('Ing. Juan Pablo Gómez', '001-1234567-8', 'jgomez@gmail.com', '829-555-8833', 'C/ Del Sol #12, Santiago'),
('Transports & Logistics RD SRL', '130-99881-2', 'logistica@transports.do', '809-555-4411', 'Zona Industrial de Haina'),
('Agrícola El Valle SA', '102-77441-9', 'contacto@agricolavel.do', '809-555-9900', 'Carretera Azua - Barahona Km 5')
ON CONFLICT (document_id) DO NOTHING;

-- 2. INVENTARIO DE MAQUINARIA Y REPUESTOS
INSERT INTO public.inventory_items (name, type, brand, model, year, price, cost, status, vin, engine_number, part_number, barcode, stock, description) VALUES
-- Camiones y Maquinaria
('Volteo Mack Granite 400', 'Camión', 'Mack', 'Granite 400', 2019, 4850000.00, 4100000.00, 'Disponible', '1M2K189C8KM001928', 'CAT-C13-8821', NULL, NULL, 1, 'Volteo de 14 metros cúbicos, motor Mack MP8, transmisión Eaton Fuller de 10 velocidades.'),
('Tractor de Oruga Caterpillar D6T', 'Equipo_Pesado', 'Caterpillar', 'D6T XL', 2018, 9200000.00, 8100000.00, 'Disponible', 'CAT00D6TKJ8912301', 'CAT-C9-9912', NULL, NULL, 1, 'Tractor bulldózer con hoja semi-U y descarificador de 3 vástagos.'),
('Excavadora Hidráulica Komatsu PC200', 'Equipo_Pesado', 'Komatsu', 'PC200-8', 2020, 7500000.00, 6400000.00, 'Reservado', 'KMTPC200H08912388', 'KMT-SAA6D107', NULL, NULL, 1, 'Excavadora de 20 toneladas con balde de 1.2 m3 y líneas auxiliares para martillo.'),

-- Repuestos Pesados
('Filtro de Aceite Heavy Duty Donaldson', 'Pieza', 'Donaldson', 'P551808', 2024, 1850.00, 1100.00, 'Disponible', NULL, NULL, 'P551808', '74233000192', 45, 'Filtro para motores Mack MP7/MP8 y Volvo D13.'),
('Bomba de Agua Caterpillar C15', 'Pieza', 'Caterpillar', 'C15 Heavy', 2024, 28500.00, 19000.00, 'Disponible', NULL, NULL, '161-5719', '74233000551', 8, 'Bomba de agua de reemplazo OEM para motor Caterpillar C15 Diésel.'),
('Inyector Diésel Bosch Common Rail', 'Pieza', 'Bosch', 'CRIN2-16', 2024, 22000.00, 15500.00, 'Disponible', NULL, NULL, '0445120067', '74233000889', 12, 'Inyector diésel para camiones diésel pesados.');

-- 3. USUARIOS Y PERFILES
INSERT INTO public.profiles (full_name, email, role, status) VALUES
('Harold Rodríguez', 'Haroldrospa@gmail.com', 'Administrador', 'Activo')
ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, status = EXCLUDED.status;

-- 4. CONFIGURACIÓN DEL SISTEMA INICIAL
INSERT INTO public.system_settings (key, value) VALUES
('sequences', '{"seqB01": "00000045", "seqB02": "00000128", "seqB15": "00000012", "expiryB01": "2026-12-31", "expiryB02": "2026-12-31", "expiryB15": "2026-12-31", "seqInspection": "0004", "seqWorkOrder": "0016", "seqReport": "4"}'::jsonb),
('schedule', '{"enabled": true, "startTime": "08:00", "endTime": "18:00", "allowWeekends": false}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
