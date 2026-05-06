import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { Resend } from 'resend'

function isAdmin(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

const STATUS_LABELS = {
  pending: 'Pedido recibido',
  confirmed: 'Pedido confirmado',
  paid: 'Pago recibido',
  shipped: 'Guía enviada',
  completed: 'Pedido archivado',
}

const STATUS_SUBJECTS = {
  confirmed: '✅ Tu pedido fue confirmado',
  paid: '💳 Recibimos tu pago',
  shipped: '📦 Tu pedido va en camino',
  completed: '🎉 Tu pedido fue entregado',
}

function buildEmailBody({ status, order, tracking_number }) {
  const itemLines = (order.items || [])
    .map(i => `  • ${i.qty}x ${i.nombre}${i.size ? ` (${i.size})` : ''} — $${(i.qty * i.unit_price).toFixed(2)}`)
    .join('\n')

  const trackUrl = `https://shenzhen-wenyue.vercel.app/track`

  const messages = {
    confirmed: `Hola ${order.customer_name},\n\nTu pedido ha sido revisado y confirmado. Pronto recibirás instrucciones de pago.\n\nProductos confirmados:\n${itemLines}\n\nTotal: $${order.total?.toFixed(2)}\n\nPuedes dar seguimiento a tu pedido en:\n${trackUrl}\n\n— Shenzhen Wenyue`,
    paid: `Hola ${order.customer_name},\n\nRecibimos tu pago correctamente. Estamos preparando tu pedido para envío.\n\nTotal pagado: $${order.total?.toFixed(2)}\n\nPuedes dar seguimiento a tu pedido en:\n${trackUrl}\n\n— Shenzhen Wenyue`,
    shipped: `Hola ${order.customer_name},\n\nTu pedido ya está en camino.\n\nNúmero de guía: ${tracking_number || order.tracking_number || 'Por confirmar'}\n\nUsa ese número para rastrear tu paquete con el servicio de paquetería.\n\nTambién puedes ver el estado de tu pedido en:\n${trackUrl}\n\n— Shenzhen Wenyue`,
    completed: `Hola ${order.customer_name},\n\nTu pedido ha sido entregado. ¡Gracias por tu compra!\n\nSi tienes alguna duda o necesitas algo más, escríbenos por WhatsApp.\n\n— Shenzhen Wenyue`,
  }

  return messages[status] || null
}

// PATCH — actualizar pedido (solo admin)
export async function PATCH(req, { params }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const supabase = getSupabase()

  // Obtener pedido actual para mantener historial y datos del cliente
  const { data: current } = await supabase
    .from('orders')
    .select('history, status, tracking_number, customer_email, customer_name, items, total')
    .eq('id', id)
    .single()

  const history = Array.isArray(current?.history) ? current.history : []

  // Agregar entrada al historial si cambia el status
  if (body.status && body.status !== current?.status) {
    history.push({
      action: STATUS_LABELS[body.status] || body.status,
      status: body.status,
      timestamp: new Date().toISOString(),
    })
  }

  // Entrada especial si se editan items manualmente
  if (body.items && !body.status) {
    history.push({
      action: 'Pedido modificado manualmente',
      status: current?.status,
      timestamp: new Date().toISOString(),
    })
  }

  // Entrada si se agrega tracking
  if (body.tracking_number && body.tracking_number !== current?.tracking_number) {
    history.push({
      action: `Guía registrada: ${body.tracking_number}`,
      status: current?.status,
      timestamp: new Date().toISOString(),
    })
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ ...body, history })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Descontar inventario al mover a pagado
  if (body.status === 'paid' && current?.status !== 'paid') {
    const itemsToDecrement = (current?.items || []).filter(i => i.confirmed !== false)
    for (const item of itemsToDecrement) {
      const qty = item.available_qty || item.qty || 0
      if (qty <= 0 || !item.nombre) continue
      const { data: inv } = await supabase
        .from('inventory')
        .select('stock')
        .eq('nombre', item.nombre)
        .maybeSingle()
      if (inv) {
        await supabase
          .from('inventory')
          .update({ stock: Math.max(0, inv.stock - qty) })
          .eq('nombre', item.nombre)
      }
    }
  }

  // Enviar email al cliente si cambió el status y tiene correo registrado
  const statusChanged = body.status && body.status !== current?.status
  const customerEmail = current?.customer_email

  if (statusChanged && customerEmail && process.env.RESEND_API_KEY) {
    const subject = STATUS_SUBJECTS[body.status]
    const text = buildEmailBody({
      status: body.status,
      order: current,
      tracking_number: body.tracking_number,
    })

    if (subject && text) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'Shenzhen Wenyue <onboarding@resend.dev>',
          to: customerEmail,
          subject,
          text,
        })
      } catch (e) {
        console.error('Error enviando email al cliente:', e.message)
      }
    }
  }

  return NextResponse.json(data)
}

// DELETE — eliminar pedido (solo admin)
export async function DELETE(req, { params }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const supabase = getSupabase()
  const { error } = await supabase.from('orders').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
