import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('settings')
    .select('value')
    .eq('key', 'catalog_live')
    .single()
  if (error || !data) return NextResponse.json({ live: true })
  return NextResponse.json({ live: data.value !== 'false' })
}
