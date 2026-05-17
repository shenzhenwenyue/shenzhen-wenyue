import { getSupabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const BUCKET = 'quotes'

export async function POST(req, { params }) {
  if (req.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { pdfBase64 } = await req.json()
  if (!pdfBase64) return NextResponse.json({ error: 'No PDF data' }, { status: 400 })

  const supabase = getSupabase()

  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.some(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }

  const pdfBuffer = Buffer.from(pdfBase64, 'base64')
  const fileName = `${id}.pdf`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.shenzhenwenyueliabilityco.com'
  return NextResponse.json({ url: `${baseUrl}/q/${id}?t=${Date.now()}` })
}
