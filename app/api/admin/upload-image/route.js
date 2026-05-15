import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAuthorized(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

// Returns a signed upload URL so the browser uploads directly to Supabase
// (bypasses Vercel's 4.5MB serverless payload limit)
export async function POST(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { filename, contentType } = await req.json()
  if (!filename || !contentType) {
    return NextResponse.json({ error: 'filename y contentType requeridos' }, { status: 400 })
  }

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  const path = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const supabase = getSupabase()

  // Auto-create bucket if it doesn't exist yet
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === 'product-images')
  if (!bucketExists) {
    const { error: bucketError } = await supabase.storage.createBucket('product-images', { public: true })
    if (bucketError) return NextResponse.json({ error: 'No se pudo crear el bucket: ' + bucketError.message }, { status: 500 })
  }

  const { data, error } = await supabase.storage
    .from('product-images')
    .createSignedUploadUrl(path)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(path)

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl })
}
