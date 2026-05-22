import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAdmin(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('ventas')
    .select('*, clients(nombre, whatsapp)')
    .order('fecha', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { client_id, fecha, descripcion, cantidad, total_venta, costo_productos, costo_envio, costo_empaque, costo_otros, fuente, notas } = await req.json()
  if (!total_venta) return NextResponse.json({ error: 'Total de venta requerido' }, { status: 400 })
  const cp = costo_productos || 0
  const ce = costo_envio || 0
  const cem = costo_empaque || 0
  const co = costo_otros || 0
  const costo_total = cp + ce + cem + co
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('ventas')
    .insert({
      client_id,
      fecha: fecha || new Date().toISOString().split('T')[0],
      descripcion,
      cantidad: cantidad || 0,
      total_venta,
      costo_total,
      costo_productos: cp,
      costo_envio: ce,
      costo_empaque: cem,
      costo_otros: co,
      fuente: fuente || 'stock_propio',
      notas,
    })
    .select('*, clients(nombre, whatsapp)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('ventas').update(fields).eq('id', id)
    .select('*, clients(nombre, whatsapp)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const supabase = getSupabase()
  const { error } = await supabase.from('ventas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
