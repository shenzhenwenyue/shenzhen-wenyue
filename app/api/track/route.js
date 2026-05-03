import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')?.toLowerCase().trim()

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, status, items, total, history, tracking_number, customer_name')
    .eq('customer_email', email)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
