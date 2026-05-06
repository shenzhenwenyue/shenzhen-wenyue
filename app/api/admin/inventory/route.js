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
  const { nombre, stock } = await req.json()
  if (!nombre || stock === undefined) return NextResponse.json({ error: 'nombre y stock requeridos' }, { status: 400 })
  const sb = getSupabase()
  const { data, error } = await sb
    .from('inventory')
    .upsert({ nombre, stock: parseInt(stock) }, { onConflict: 'nombre' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
