-- ============================================================
-- BASE DE CLIENTES — Shenzhen Wenyue
-- Ejecutar en el dashboard de Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  ciudad TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion TEXT,
  cantidad INTEGER DEFAULT 0,
  total_venta NUMERIC NOT NULL DEFAULT 0,
  costo_total NUMERIC DEFAULT 0,
  fuente TEXT DEFAULT 'stock_propio',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID REFERENCES ventas(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  monto NUMERIC NOT NULL,
  metodo TEXT DEFAULT 'Zelle',
  cuenta TEXT,
  referencia TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deudas_proveedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor TEXT NOT NULL,
  concepto TEXT,
  monto_total NUMERIC NOT NULL DEFAULT 0,
  monto_pagado NUMERIC DEFAULT 0,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  estado TEXT DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DATOS INICIALES — Fernando Aguilera (13 mayo 2026)
-- 12 perfumes · costo $16/u · pagó $500 Zelle + $52 CashApp
-- ============================================================
WITH nuevo_cliente AS (
  INSERT INTO clients (nombre, whatsapp)
  VALUES ('Fernando Aguilera', '+18176660803')
  RETURNING id
),
nueva_venta AS (
  INSERT INTO ventas (client_id, fecha, descripcion, cantidad, total_venta, costo_total, fuente)
  SELECT id, '2026-05-13', '12 perfumes diseñadores', 12, 552.00, 214.82, 'stock_propio'
  FROM nuevo_cliente
  RETURNING id, client_id
)
-- Si ya corriste el SQL anterior, usa este UPDATE para corregir el costo:
-- UPDATE ventas SET costo_total = 214.82, notas = 'Productos $192 + envío $20.82 + caja $2'
-- WHERE descripcion = '12 perfumes diseñadores' AND fecha = '2026-05-13';

INSERT INTO pagos (venta_id, client_id, monto, metodo, cuenta, fecha)
SELECT id, client_id, 500, 'Zelle', 'Shenzhen', '2026-05-13' FROM nueva_venta
UNION ALL
SELECT id, client_id, 52, 'CashApp', 'CashApp', '2026-05-13' FROM nueva_venta;
