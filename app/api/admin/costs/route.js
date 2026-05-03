import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAuthorized(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const sb = getSupabase()
  const { data, error } = await sb.from('cost_rules').select('*').order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const sb = getSupabase()
  const { data, error } = await sb.from('cost_rules').insert([body]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const { id, ...fields } = body
  const sb = getSupabase()
  const { data, error } = await sb.from('cost_rules').update(fields).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await req.json()
  const sb = getSupabase()
  const { error } = await sb.from('cost_rules').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
