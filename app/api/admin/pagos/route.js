import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAdmin(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('pagos')
    .select('*, clients(nombre), ventas(descripcion, total_venta)')
    .order('fecha', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { venta_id, client_id, monto, metodo, cuenta, referencia, fecha, notas } = await req.json()
  if (!monto || monto <= 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('pagos')
    .insert({
      venta_id,
      client_id,
      monto,
      metodo,
      cuenta,
      referencia,
      fecha: fecha || new Date().toISOString().split('T')[0],
      notas,
    })
    .select('*, clients(nombre), ventas(descripcion, total_venta)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const supabase = getSupabase()
  const { error } = await supabase.from('pagos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
