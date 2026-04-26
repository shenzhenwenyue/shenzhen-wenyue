'use client'
import { useState } from 'react'
import { generarConfirmacionPDF } from '@/lib/pdf'

const WHATSAPP = '16572621801'

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  paid: 'Pagado',
  shipped: 'Enviado',
  completed: 'Completado',
}

export default function AdminOrderCard({ order: initialOrder, adminPassword }) {
  const [order, setOrder] = useState(initialOrder)
  const [saving, setSaving] = useState(false)
  const [partialQtys, setPartialQtys] = useState({})
  const [shipping, setShipping] = useState('')
  const [trackingInput, setTrackingInput] = useState(order.tracking_number || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState(false)

  const allReviewed = order.items.every(i => i.confirmed !== null)
  const confirmedItems = order.items.filter(i => i.confirmed !== false)
  const shippingCost = parseFloat(shipping) || 0
  const confirmedTotal = confirmedItems.reduce((sum, i) => sum + (i.available_qty || i.qty) * i.unit_price, 0) + shippingCost

  async function patch(updates) {
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (res.ok) setOrder(data)
    } finally {
      setSaving(false)
    }
  }

  function setItemConfirmed(index, confirmed, available_qty = null) {
    const updatedItems = order.items.map((item, i) => {
      if (i !== index) return item
      return {
        ...item,
        confirmed,
        available_qty: available_qty ?? (confirmed ? item.qty : null),
      }
    })
    patch({ items: updatedItems })
  }

  async function handleGenerarPDF() {
    const doc = await generarConfirmacionPDF(order, shippingCost)
    doc.save(`confirmacion-${order.id.substring(0, 8).toUpperCase()}.pdf`)
  }

  function handleEnviarWhatsApp() {
    const unavailable = order.items.filter(i => i.confirmed === false)
    let msg = `Hola *${order.customer_name}*! Confirmamos disponibilidad de tu pedido:\n\n`
    confirmedItems.forEach(item => {
      const qty = item.available_qty || item.qty
      msg += `✓ ${qty}× ${item.nombre} — $${(qty * item.unit_price).toFixed(2)}\n`
    })
    if (unavailable.length > 0) {
      msg += `\nNo disponible:\n`
      unavailable.forEach(item => { msg += `✗ ${item.nombre}\n` })
    }
    if (shippingCost > 0) msg += `\nEnvío: $${shippingCost.toFixed(2)}`
    msg += `\n*Total: $${confirmedTotal.toFixed(2)}*`
    msg += `\n\nTe enviamos el PDF con los detalles. Para proceder, favor de realizar el pago.`
    window.open(`https://wa.me/${order.customer_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  async function handleDelete() {
    if (deletePassword !== adminPassword) {
      setDeleteError(true)
      return
    }
    setSaving(true)
    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword },
    })
    if (res.ok) {
      setOrder(null) // ocultar la card
    }
    setSaving(false)
  }

  function handleOrdenProveedor() {
    const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    let msg = `*ORDEN DE COMPRA — Shenzhen Wenyue*\n`
    msg += `Fecha: ${fecha}\n`
    msg += `Pedido: #${order.id.substring(0, 8).toUpperCase()}\n\n`
    confirmedItems.forEach(item => {
      const qty = item.available_qty || item.qty
      const sku = item.sku ? `[${item.sku}] ` : ''
      msg += `• ${sku}${item.nombre} — ${qty} u.\n`
    })
    msg += `\nTotal unidades: ${confirmedItems.reduce((s, i) => s + (i.available_qty || i.qty), 0)}`
    navigator.clipboard?.writeText(msg)
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function handleEnviarTracking() {
    const msg =
      `Hola *${order.customer_name}*! Tu pedido ha sido enviado.\n\n` +
      `*Número de seguimiento:* ${trackingInput}\n\n` +
      `Puedes rastrear tu paquete con ese número. Cualquier duda estamos a tus órdenes.`
    window.open(`https://wa.me/${order.customer_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const fecha = new Date(order.created_at).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  if (!order) return null

  const canDelete = ['confirmed', 'shipped', 'completed'].includes(order.status)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">{order.customer_name}</span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{fecha} · #{order.id.substring(0, 8).toUpperCase()}</p>
          {order.tracking_number && (
            <p className="text-xs text-blue-600 mt-0.5">Tracking: {order.tracking_number}</p>
          )}
        </div>
        <a
          href={`https://wa.me/${order.customer_whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-green-600 font-medium flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {order.customer_whatsapp}
        </a>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-50">
        {order.items.map((item, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                <p className="text-xs text-gray-400">{item.categoria} · {item.qty} u. · ${item.unit_price.toFixed(2)} c/u</p>
              </div>
              <p className="text-sm font-semibold text-gray-700 shrink-0 ml-2">
                ${(item.qty * item.unit_price).toFixed(2)}
              </p>
            </div>

            {order.status === 'pending' && (
              <div className="flex flex-wrap gap-2 mt-1">
                <button
                  onClick={() => setItemConfirmed(i, true)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    item.confirmed === true && item.available_qty === item.qty
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                  }`}
                >
                  Hay todo
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const qty = parseInt(partialQtys[i]) || 1
                      setItemConfirmed(i, true, qty)
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      item.confirmed === true && item.available_qty !== item.qty
                        ? 'bg-yellow-400 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-yellow-100'
                    }`}
                  >
                    Parcial
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={item.qty - 1}
                    value={partialQtys[i] ?? ''}
                    onChange={e => setPartialQtys(prev => ({ ...prev, [i]: e.target.value }))}
                    placeholder="u."
                    className="w-12 px-2 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setItemConfirmed(i, false)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    item.confirmed === false
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                  }`}
                >
                  No hay
                </button>
              </div>
            )}

            {order.status !== 'pending' && (
              <div className="mt-1">
                {item.confirmed === false ? (
                  <span className="text-xs text-red-500 font-medium">No disponible</span>
                ) : (
                  <span className="text-xs text-green-600 font-medium">
                    {item.available_qty && item.available_qty < item.qty
                      ? `${item.available_qty} u. disponibles`
                      : 'Disponible'}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-2">

        {/* Envío — visible siempre en pending */}
        {order.status === 'pending' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-gray-600 shrink-0">Costo de envío</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping}
                  onChange={e => setShipping(e.target.value)}
                  placeholder="0.00"
                  className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>
            {allReviewed && (
              <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total confirmado</span>
                <span>${confirmedTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Número de seguimiento — visible en paid */}
        {order.status === 'paid' && (
          <div className="space-y-2">
            <label className="block text-sm text-gray-600">Número de seguimiento</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={trackingInput}
                onChange={e => setTrackingInput(e.target.value)}
                placeholder="Ej: 1Z999AA10123456784"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 flex-wrap">
          {allReviewed && order.status === 'pending' && (
            <>
              <button
                onClick={handleGenerarPDF}
                className="flex-1 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Generar PDF
              </button>
              <button
                onClick={handleEnviarWhatsApp}
                className="flex-1 py-2 bg-green-500 text-white text-xs font-semibold rounded-xl hover:bg-green-600 transition-colors"
              >
                Avisar cliente
              </button>
            </>
          )}

          {order.status === 'pending' && allReviewed && (
            <button
              onClick={() => patch({ status: 'confirmed' })}
              disabled={saving}
              className="w-full py-2 bg-blue-500 text-white text-xs font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              Marcar como Confirmado
            </button>
          )}

          {order.status === 'confirmed' && (
            <>
              <button
                onClick={handleOrdenProveedor}
                className="w-full py-2 bg-gray-800 text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors"
              >
                Exportar orden para proveedor
              </button>
              <button
                onClick={() => patch({ status: 'paid' })}
                disabled={saving}
                className="w-full py-2 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                Marcar Pagado
              </button>
            </>
          )}

          {order.status === 'paid' && (
            <button
              onClick={() => {
                if (!trackingInput.trim()) return
                patch({ status: 'shipped', tracking_number: trackingInput.trim() })
                handleEnviarTracking()
              }}
              disabled={saving || !trackingInput.trim()}
              className="w-full py-2 bg-purple-500 text-white text-xs font-semibold rounded-xl hover:bg-purple-600 disabled:opacity-50 transition-colors"
            >
              Marcar Enviado y notificar cliente
            </button>
          )}

          {order.status === 'shipped' && (
            <button
              onClick={() => patch({ status: 'completed' })}
              disabled={saving}
              className="w-full py-2 bg-gray-400 text-white text-xs font-semibold rounded-xl hover:bg-gray-500 disabled:opacity-50 transition-colors"
            >
              Archivar
            </button>
          )}

          {/* Eliminar pedido */}
          {canDelete && !showDeleteConfirm && (
            <button
              onClick={() => { setShowDeleteConfirm(true); setDeleteError(false); setDeletePassword('') }}
              className="w-full py-2 border border-red-200 text-red-400 text-xs font-semibold rounded-xl hover:bg-red-50 transition-colors"
            >
              Eliminar pedido
            </button>
          )}

          {showDeleteConfirm && (
            <div className="border border-red-200 rounded-xl p-3 space-y-2 bg-red-50">
              <p className="text-xs text-red-600 font-medium">Confirma tu contraseña para eliminar</p>
              <input
                type="password"
                value={deletePassword}
                onChange={e => { setDeletePassword(e.target.value); setDeleteError(false) }}
                placeholder="Contraseña"
                className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none bg-white"
              />
              {deleteError && <p className="text-xs text-red-500">Contraseña incorrecta</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-1.5 border border-gray-200 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving || !deletePassword}
                  className="flex-1 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700',
    shipped: 'bg-purple-100 text-purple-700',
    completed: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.pending}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}
