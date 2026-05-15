import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAuthorized(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function POST(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let formData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Request inválido' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const supabase = getSupabase()
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
