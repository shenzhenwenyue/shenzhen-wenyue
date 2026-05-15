import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAuthorized(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

// GET: all products including disabled (admin only)
export async function GET(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data, error } = await getSupabase().from('products').select('*').order('categoria').order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH: bulk toggle disponible for a category or subcategory
export async function PATCH(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { categoria, subcategoria, disponible } = await req.json()
  if (!categoria || disponible === undefined) {
    return NextResponse.json({ error: 'categoria y disponible requeridos' }, { status: 400 })
  }
  let query = getSupabase()
    .from('products')
    .update({ disponible: Boolean(disponible) })
    .eq('categoria', categoria)
  if (subcategoria) query = query.eq('subcategoria', subcategoria)
  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
