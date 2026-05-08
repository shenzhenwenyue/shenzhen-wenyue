import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { Resend } from 'resend'

function isAdmin(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

// GET — listar pedidos (solo admin)
export async function GET(req) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — crear pedido (público, desde el catálogo)
export async function POST(req) {
  const body = await req.json()
  const { customer_name, customer_email, customer_whatsapp, items, total } = body

  if (!customer_name?.trim() || !customer_email?.trim() || !customer_whatsapp?.trim() || !items?.length) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const supabase = getSupabase()
  const initialHistory = [{
    action: 'Pedido recibido',
    status: 'pending',
    timestamp: new Date().toISOString(),
  }]

  const { data, error } = await supabase
    .from('orders')
    .insert({ customer_name, customer_email, customer_whatsapp, items, total, status: 'pending', history: initialHistory })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificación por correo (no bloqueante)
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const itemLines = data.items
        .map(i => `• ${i.qty}x ${i.nombre}${i.size ? ` (${i.size})` : ''} — $${(i.qty * i.unit_price).toFixed(2)}`)
        .join('\n')

      const orderNumber = `#${data.id.substring(0, 8).toUpperCase()}`
      await resend.emails.send({
        from: 'Pedidos <onboarding@resend.dev>',
        to: process.env.NOTIFY_EMAIL,
        subject: `Nuevo pedido ${orderNumber} — ${data.customer_name}`,
        text: [
          `NUEVO PEDIDO — Shenzhen Wenyue`,
          ``,
          `Orden: ${orderNumber}`,
          `Cliente: ${data.customer_name}`,
          `Correo: ${data.customer_email || 'No proporcionado'}`,
          `WhatsApp: ${data.customer_whatsapp}`,
          ``,
          `Productos:`,
          itemLines,
          ``,
          `Total estimado: $${data.total.toFixed(2)}`,
          ``,
          `Ver en el panel: https://shenzhen-wenyue.vercel.app/admin`,
        ].join('\n'),
      })
    } catch (e) {
      console.error('Error enviando email:', e.message)
    }
  }

  return NextResponse.json(data, { status: 201 })
}
