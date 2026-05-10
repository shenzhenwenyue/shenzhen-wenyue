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

  // Crear bucket si no existe
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === BUCKET)
  if (!bucketExists) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }

  const pdfBuffer = Buffer.from(pdfBase64, 'base64')
  const fileName = `${id}.pdf`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Devolver URL propia (dominio del negocio) en lugar de la URL de Supabase
  const host = req.headers.get('host')
  const proto = host?.includes('localhost') ? 'http' : 'https'
  const shortUrl = `${proto}://${host}/q/${id}`

  return NextResponse.json({ url: shortUrl })
}
