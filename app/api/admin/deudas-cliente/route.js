import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAdmin(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('deudas_cliente')
    .select('*, clients(nombre, whatsapp)')
    .order('fecha', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { client_id, concepto, monto_total, monto_pagado, fecha, notas } = await req.json()
  if (!monto_total) return NextResponse.json({ error: 'Monto requerido' }, { status: 400 })
  const pagado = monto_pagado || 0
  const estado = pagado >= monto_total ? 'pagado' : pagado > 0 ? 'parcial' : 'pendiente'
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('deudas_cliente')
    .insert({
      client_id,
      concepto,
      monto_total,
      monto_pagado: pagado,
      fecha: fecha || new Date().toISOString().split('T')[0],
      estado,
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
  if (fields.monto_pagado !== undefined && fields.monto_total !== undefined) {
    if (fields.monto_pagado >= fields.monto_total) fields.estado = 'pagado'
    else if (fields.monto_pagado > 0) fields.estado = 'parcial'
    else fields.estado = 'pendiente'
  }
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('deudas_cliente')
    .update(fields).eq('id', id)
    .select('*, clients(nombre, whatsapp)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const supabase = getSupabase()
  const { error } = await supabase.from('deudas_cliente').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
