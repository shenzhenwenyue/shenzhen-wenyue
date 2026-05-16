import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAuthorized(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function PATCH(req, { params }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = params
  const body = await req.json()
  const updates = {}
  if (body.imagen_url !== undefined) updates.imagen_url = body.imagen_url || null
  if (body.disponible !== undefined) updates.disponible = body.disponible
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  const { error } = await getSupabase()
    .from('products')
    .update(updates)
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
