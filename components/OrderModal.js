'use client'
import { useState } from 'react'
import { getPrecio } from '@/lib/pricing'

const WHATSAPP = '16572621801'

export default function OrderModal({ items, products, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  // Enriquecer items con precio calculado
  const orderItems = items.map(item => {
    const product = products.find(p => p.id === item.id)
    if (!product) return null
    return {
      product_id: product.id,
      nombre: product.nombre,
      categoria: product.categoria,
      sku: product.sku || '',
      qty: item.qty,
      unit_price: getPrecio(product, item.qty),
      confirmed: null,
      available_qty: null,
    }
  }).filter(Boolean)

  const total = orderItems.reduce((sum, i) => sum + i.unit_price * i.qty, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !whatsapp.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_whatsapp: whatsapp.trim(),
          items: orderItems,
          total,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar el pedido')

      setDone(true)

      // Avisar por WhatsApp
      const msg =
        `Hola! Soy *${name.trim()}*.\n\n` +
        `Acabo de enviar una solicitud de cotización con ${orderItems.length} producto${orderItems.length !== 1 ? 's' : ''}.\n\n` +
        `Espero su confirmación de disponibilidad. Gracias!`

      setTimeout(() => {
        window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank')
        onSuccess()
      }, 1800)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6">

        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Solicitud enviada</h3>
            <p className="text-sm text-gray-500 mt-1">Te abriremos WhatsApp para notificar al vendedor...</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Solicitar Cotización</h2>
            <p className="text-sm text-gray-500 mb-5">
              Confirmaremos disponibilidad y te enviaremos un PDF antes de cobrar.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tu nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nombre completo"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tu número de WhatsApp</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="+1 713 000 0000"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                />
              </div>

              {/* Resumen del pedido */}
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                {orderItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-gray-600">
                    <span className="truncate mr-2">{item.qty}× {item.nombre}</span>
                    <span className="shrink-0">${(item.unit_price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-gray-900">
                  <span>Total estimado</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !name.trim() || !whatsapp.trim()}
                className="w-full py-3.5 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                No se cobra nada ahora. Recibirás confirmación de disponibilidad antes de pagar.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
