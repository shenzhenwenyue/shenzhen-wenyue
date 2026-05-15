import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAuthorized(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function PATCH(req, { params }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = params
  const body = await req.json()
  const { imagen_url } = body
  if (imagen_url === undefined) return NextResponse.json({ error: 'imagen_url requerido' }, { status: 400 })
  const { error } = await getSupabase()
    .from('products')
    .update({ imagen_url: imagen_url || null })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
