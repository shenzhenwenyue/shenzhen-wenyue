import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAuthorized(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const sb = getSupabase()
  const { data, error } = await sb.from('inventory').select('*').order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { nombre, stock, destacado } = await req.json()
  if (!nombre) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })
  if (stock === undefined && destacado === undefined)
    return NextResponse.json({ error: 'stock o destacado requeridos' }, { status: 400 })
  const upsertData = { nombre }
  if (stock !== undefined) upsertData.stock = Math.max(0, parseInt(stock) || 0)
  if (destacado !== undefined) upsertData.destacado = Boolean(destacado)
  const sb = getSupabase()
  const { data, error } = await sb
    .from('inventory')
    .upsert(upsertData, { onConflict: 'nombre' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
