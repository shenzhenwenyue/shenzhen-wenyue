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

// PATCH: bulk toggle disponible for a category, subcategory, or sku_prefix
export async function PATCH(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { categoria, subcategoria, sku_prefix, disponible } = await req.json()
  if (disponible === undefined) {
    return NextResponse.json({ error: 'disponible requerido' }, { status: 400 })
  }

  let query = getSupabase().from('products').update({ disponible: Boolean(disponible) })

  if (sku_prefix) {
    query = query.ilike('sku', `${sku_prefix}%`)
  } else if (categoria) {
    query = query.eq('categoria', categoria)
    if (subcategoria) query = query.eq('subcategoria', subcategoria)
  } else {
    return NextResponse.json({ error: 'categoria o sku_prefix requerido' }, { status: 400 })
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
