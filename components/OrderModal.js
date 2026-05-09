'use client'
import { useState } from 'react'
import { getPrecio } from '@/lib/pricing'
import { DEFAULT_SHIPPING } from '@/lib/constants'

const WHATSAPP = '16613737977'

// Estas categorías usan precios por subcategoría, no por categoría total
const SUBCATEGORIA_PRICING = new Set(['Lululemon', 'Alo Yoga'])

export default function OrderModal({ items, products, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('+1')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [waUrl, setWaUrl] = useState(null)

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
  const shipping = DEFAULT_SHIPPING
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

      const orderNumber = `#${data.id.substring(0, 8).toUpperCase()}`

      const catSummary = Object.entries(totalByCategory)
        .map(([cat, qty]) => {
          const sub = orderItems.filter(i => i.categoria === cat).reduce((s, i) => s + i.unit_price * i.qty, 0)
          return `• ${cat}: ${qty} pz — $${sub.toFixed(2)}`
        }).join('\n')
      const msg =
        `Hola! Soy *${name.trim()}*.\n` +
        `📋 Pedido *${orderNumber}*\n\n` +
        `📦 Solicitud de cotización:\n${catSummary}\n\n` +
        `Subtotal: $${subtotal.toFixed(2)}\n` +
        `Envío: $${shipping.toFixed(2)}\n` +
        `*Total estimado: $${total.toFixed(2)}*\n\n` +
        `Espero confirmación de disponibilidad. Gracias!`

      setWaUrl(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`)
      setDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={done ? onSuccess : onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto">

        {done ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Request Sent</h3>
              <p className="text-sm text-gray-500 mt-1">Tap the button to send your order via WhatsApp.</p>
            </div>
            {waUrl && (
              <a
                href={waUrl}
                onClick={() => setTimeout(onSuccess, 500)}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors"
              >
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Send Order via WhatsApp
              </a>
            )}
            <button
              onClick={onSuccess}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Request a Quote</h2>
            <p className="text-sm text-gray-500 mb-5">
              We'll confirm availability and send you a PDF before charging.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Your email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">You'll use this to track your order online.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Your WhatsApp number</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    required
                    className={`px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-white shrink-0 ${
                      !countryCode ? 'border-gray-200 text-gray-400' : 'border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="" disabled>Code</option>
                    <option value="+1">🇺🇸 +1 USA</option>
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
                  <p className="text-xs text-red-400">{whatsapp.length}/10 digits — {10 - whatsapp.length} more needed</p>
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
                    <span>${shipping.toFixed(2)}</span>
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
                  const scope = isSub ? 'subcategory' : 'category'
                  return (
                    <p key={key} className="text-xs text-green-600 pt-0.5">
                      Price for {label} based on {qty} pcs total in the {scope}
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
                {loading ? 'Sending...' : 'Send Request'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                No charge now. You'll receive availability confirmation before payment.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
