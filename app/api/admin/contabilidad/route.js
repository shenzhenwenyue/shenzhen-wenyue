import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAdmin(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const supabase = getSupabase()
  const [ventasRes, pagosRes, deudasProvRes, deudasClienteRes] = await Promise.all([
    supabase.from('ventas').select('total_venta, costo_total'),
    supabase.from('pagos').select('monto'),
    supabase.from('deudas_proveedor').select('monto_total, monto_pagado'),
    supabase.from('deudas_cliente').select('monto_total, monto_pagado'),
  ])
  const total_ventas = (ventasRes.data || []).reduce((s, v) => s + (v.total_venta || 0), 0)
  const total_costos = (ventasRes.data || []).reduce((s, v) => s + (v.costo_total || 0), 0)
  const total_cobrado = (pagosRes.data || []).reduce((s, p) => s + (p.monto || 0), 0)
  const deuda_proveedores = (deudasProvRes.data || []).reduce(
    (s, d) => s + Math.max(0, (d.monto_total || 0) - (d.monto_pagado || 0)), 0
  )
  const cobros_pendientes = (deudasClienteRes.data || []).reduce(
    (s, d) => s + Math.max(0, (d.monto_total || 0) - (d.monto_pagado || 0)), 0
  )
  return NextResponse.json({
    total_ventas,
    total_costos,
    ganancia_bruta: total_ventas - total_costos,
    total_cobrado,
    por_cobrar: Math.max(0, total_ventas - total_cobrado) + cobros_pendientes,
    deuda_proveedores,
  })
}
