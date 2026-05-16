import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAuthorized(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data, error } = await getSupabase()
    .from('settings')
    .select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const result = {}
  ;(data || []).forEach(row => { result[row.key] = row.value })
  return NextResponse.json(result)
}

export async function PATCH(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const updates = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }))
  if (updates.length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  const { error } = await getSupabase()
    .from('settings')
    .upsert(updates, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
