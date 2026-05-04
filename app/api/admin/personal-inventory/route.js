import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAdmin(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('personal_items')
    .select('*')
    .order('fecha_compra', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const { nombre, categoria, qty, costo_unit, notas, fecha_compra } = body
  if (!nombre?.trim() || !qty || !costo_unit) {
    return NextResponse.json({ error: 'Nombre, cantidad y costo son requeridos.' }, { status: 400 })
  }
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('personal_items')
    .insert({ nombre, categoria, qty: parseInt(qty), costo_unit: parseFloat(costo_unit), notas, fecha_compra, pagado: false })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const { id, pagado, nombre, categoria, qty, costo_unit, notas, fecha_compra } = body
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const supabase = getSupabase()
  const updates = {}
  if (pagado !== undefined) updates.pagado = pagado
  if (nombre !== undefined) updates.nombre = nombre
  if (categoria !== undefined) updates.categoria = categoria
  if (qty !== undefined) updates.qty = parseInt(qty)
  if (costo_unit !== undefined) updates.costo_unit = parseFloat(costo_unit)
  if (notas !== undefined) updates.notas = notas
  if (fecha_compra !== undefined) updates.fecha_compra = fecha_compra
  const { data, error } = await supabase
    .from('personal_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const supabase = getSupabase()
  const { error } = await supabase.from('personal_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
