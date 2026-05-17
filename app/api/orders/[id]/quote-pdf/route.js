import { getSupabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const BUCKET = 'quotes'

export async function POST(req, { params }) {
  if (req.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const supabase = getSupabase()
  const fileName = `${id}.pdf`
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.shenzhenwenyueliabilityco.com'
  const shortUrl = `${baseUrl}/q/${id}`

  // Asegurar que el bucket existe
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.some(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }

  // Modo 1: browser pide URL firmada para subir directo a Supabase
  if (body.action === 'request-upload-url') {
    // Borrar archivo existente primero para evitar conflicto de "already exists"
    await supabase.storage.from(BUCKET).remove([fileName])

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(fileName)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ uploadUrl: data.signedUrl, token: data.token, shortUrl })
  }

  // Modo 2 (fallback): PDF en base64 — solo para PDFs pequeños sin imágenes
  const { pdfBase64 } = body
  if (!pdfBase64) return NextResponse.json({ error: 'No PDF data' }, { status: 400 })

  const pdfBuffer = Buffer.from(pdfBase64, 'base64')
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url: shortUrl })
}
