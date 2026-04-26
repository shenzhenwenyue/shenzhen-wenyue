import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAdmin(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

// GET — listar pedidos (solo admin)
export async function GET(req) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — crear pedido (público, desde el catálogo)
export async function POST(req) {
  const body = await req.json()
  const { customer_name, customer_whatsapp, items, total } = body

  if (!customer_name?.trim() || !customer_whatsapp?.trim() || !items?.length) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('orders')
    .insert({ customer_name, customer_whatsapp, items, total, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
