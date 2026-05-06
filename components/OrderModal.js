'use client'
import { useState } from 'react'
import { getPrecio } from '@/lib/pricing'

const WHATSAPP = '16613737977'

// Estas categorías usan precios por subcategoría, no por categoría total
const SUBCATEGORIA_PRICING = new Set(['Lululemon', 'Alo Yoga'])

export default function OrderModal({ items, products, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  // qty total por categoría — para resumen WhatsApp y notas
  const totalByCategory = items.reduce((acc, item) => {
    const cat = item.categoria || products.find(p => p.id === item.productId)?.categoria || ''
    acc[cat] = (acc[cat] || 0) + item.qty
    return acc
  }, {})

  // Para pricing: Lululemon/Alo agrupan por subcategoría; el resto por categoría
  const totalByPricingGroup = items.reduce((acc, item) => {
    const product = products.find(p => p.id === item.productId)
    const cat = item.categoria || product?.categoria || ''
    const sub = product?.subcategoria || ''
    const key = SUBCATEGORIA_PRICING.has(cat) && sub ? `${cat}__${sub}` : cat
    acc[key] = (acc[key] || 0) + item.qty
    return acc
  }, {})

  // Enriquecer items con precio y subcategoria
  const orderItems = items.map(item => {
    const product = products.find(p => p.id === item.productId)
    if (!product) return null
    const cat = item.categoria || product.categoria
    const sub = product.subcategoria || ''
    const pricingKey = SUBCATEGORIA_PRICING.has(cat) && sub ? `${cat}__${sub}` : cat
    const pricingQty = totalByPricingGroup[pricingKey] || item.qty
    return {
      product_id: product.id,
      nombre: product.nombre,
      categoria: product.categoria,
      subcategoria: product.subcategoria || '',
      sku: product.sku || '',
      size: item.size || null,
      imagen_url: product.imagen_url || null,
      qty: item.qty,
      unit_price: getPrecio(product, pricingQty),
      confirmed: null,
      available_qty: null,
    }
  }).filter(Boolean)

  const subtotal = orderItems.reduce((sum, i) => sum + i.unit_price * i.qty, 0)
  const shipping = 12
  const total = subtotal + shipping

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !whatsapp.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_email: email.trim().toLowerCase(),
          customer_whatsapp: countryCode + whatsapp.trim().replace(/\D/g, ''),
          items: orderItems,
          total,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar el pedido')

      setDone(true)

      // Avisar por WhatsApp con resumen por categoría
      const catSummary = Object.entries(totalByCategory)
        .map(([cat, qty]) => {
          const sub = orderItems.filter(i => i.categoria === cat).reduce((s, i) => s + i.unit_price * i.qty, 0)
          return `• ${cat}: ${qty} pz — $${sub.toFixed(2)}`
        }).join('\n')
      const msg =
        `Hola! Soy *${name.trim()}*.\n\n` +
        `📦 Solicitud de cotización:\n${catSummary}\n\n` +
        `Subtotal: $${subtotal.toFixed(2)}\n` +
        `Envío: $${shipping.toFixed(2)}\n` +
        `*Total estimado: $${total.toFixed(2)}*\n\n` +
        `Espero confirmación de disponibilidad. Gracias!`

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
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto">

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
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tu correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">Lo usarás para rastrear tu pedido en línea.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tu número de WhatsApp</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    required
                    className={`px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-white shrink-0 ${
                      !countryCode ? 'border-gray-200 text-gray-400' : 'border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="" disabled>Código</option>
                    <option value="+1">🇺🇸 +1 USA</option>
                    <option value="+52">🇲🇽 +52 México</option>
                  </select>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setWhatsapp(digits)
                    }}
                    placeholder="7130000000"
                    required
                    maxLength={10}
                    className={`flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
                      whatsapp.length > 0 && whatsapp.length < 10
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 focus:border-gray-400'
                    }`}
                  />
                </div>
                {whatsapp.length > 0 && whatsapp.length < 10 && (
                  <p className="text-xs text-red-400">{whatsapp.length}/10 dígitos — faltan {10 - whatsapp.length}</p>
                )}
              </div>

              {/* Resumen del pedido */}
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                {orderItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-gray-600">
                    <span className="truncate mr-2">{item.qty}× {item.nombre}{item.size ? ` (${item.size})` : ''}</span>
                    <span className="shrink-0">${(item.unit_price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 mt-2 pt-2 space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Envío estimado</span>
                    <span>$10.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                    <span>Total estimado</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                {/* Contexto de precio mayoreo — por subcategoría para Lulu/Alo, por categoría para el resto */}
                {Object.entries(totalByPricingGroup).map(([key, qty]) => {
                  const isSub = key.includes('__')
                  const label = isSub ? key.split('__')[1] : key
                  const scope = isSub ? 'subcategoría' : 'categoría'
                  return (
                    <p key={key} className="text-xs text-green-600 pt-0.5">
                      Precio {label} basado en {qty} pz totales de la {scope}
                    </p>
                  )
                })}
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !name.trim() || !email.trim() || whatsapp.length !== 10 || !countryCode}
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
