import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAdmin(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const supabase = getSupabase()
  const [ventasRes, pagosRes, deudasProvRes, deudaChristianRes] = await Promise.all([
    supabase.from('ventas').select('total_venta, costo_total, costo_productos, costo_envio, costo_empaque, costo_otros'),
    supabase.from('pagos').select('monto'),
    supabase.from('deudas_proveedor').select('monto_total, monto_pagado'),
    supabase.from('deudas_cliente').select('monto_total, monto_pagado').is('client_id', null),
  ])
  const vs = ventasRes.data || []
  const total_ventas     = vs.reduce((s, v) => s + (v.total_venta || 0), 0)
  const total_costos     = vs.reduce((s, v) => s + (v.costo_total || 0), 0)
  const costo_productos  = vs.reduce((s, v) => s + (v.costo_productos || 0), 0)
  const costo_envio      = vs.reduce((s, v) => s + (v.costo_envio || 0), 0)
  const costo_empaque    = vs.reduce((s, v) => s + (v.costo_empaque || 0), 0)
  const costo_otros      = vs.reduce((s, v) => s + (v.costo_otros || 0), 0)
  const total_cobrado    = (pagosRes.data || []).reduce((s, p) => s + (p.monto || 0), 0)
  const deuda_proveedores = (deudasProvRes.data || []).reduce(
    (s, d) => s + Math.max(0, (d.monto_total || 0) - (d.monto_pagado || 0)), 0
  )
  const deuda_a_christian = (deudaChristianRes.data || []).reduce(
    (s, d) => s + Math.max(0, (d.monto_total || 0) - (d.monto_pagado || 0)), 0
  )
  return NextResponse.json({
    total_ventas,
    total_costos,
    costo_productos,
    costo_envio,
    costo_empaque,
    costo_otros,
    ganancia_bruta: total_ventas - total_costos,
    total_cobrado,
    deuda_a_christian,
    deuda_proveedores,
  })
}
