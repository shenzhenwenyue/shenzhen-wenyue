import { NextResponse } from 'next/server'

const BUCKET = 'quotes'

export async function GET(req, { params }) {
  const { orderId } = await params
  const supabaseUrl = process.env.SUPABASE_URL
  if (!supabaseUrl || !orderId || !/^[0-9a-f-]{36}$/.test(orderId)) {
    return new NextResponse('Not found', { status: 404 })
  }
  const pdfUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${orderId}.pdf`
  return NextResponse.redirect(pdfUrl, { status: 302 })
}
