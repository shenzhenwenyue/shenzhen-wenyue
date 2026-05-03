'use client'
import { useState } from 'react'

const STATUS_STEPS = [
  { key: 'pending',   label: 'Pedido recibido' },
  { key: 'confirmed', label: 'Confirmado' },
  { key: 'paid',      label: 'Pago recibido' },
  { key: 'shipped',   label: 'En camino' },
  { key: 'completed', label: 'Entregado' },
]

function getStepIndex(status) {
  const i = STATUS_STEPS.findIndex(s => s.key === status)
  return i === -1 ? 0 : i
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TrackPage() {
  const [email, setEmail] = useState('')
  const [orders, setOrders] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    setOrders(null)
    try {
      const res = await fetch(`/api/track?email=${encodeURIComponent(email.trim().toLowerCase())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al buscar pedidos')
      setOrders(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900">Seguimiento de Pedidos</h1>
            <p className="text-xs text-gray-400">Shenzhen Wenyue</p>
          </div>
          <a href="/" className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
            ← Volver al catálogo
          </a>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Search card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-1">Busca tu pedido</h2>
          <p className="text-sm text-gray-500 mb-5">
            Ingresa el correo electrónico con el que realizaste tu pedido.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors shrink-0"
            >
              {loading ? '...' : 'Buscar'}
            </button>
          </form>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {/* Results */}
        {orders !== null && (
          orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700">No encontramos pedidos</p>
              <p className="text-xs text-gray-400 mt-1">
                Verifica que sea el mismo correo que usaste al hacer tu pedido.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 px-1">
                {orders.length} pedido{orders.length !== 1 ? 's' : ''} encontrado{orders.length !== 1 ? 's' : ''}
              </p>
              {orders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )
        )}

        {/* Help footer */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4 items-start">
          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">¿Tienes dudas?</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Escríbenos por WhatsApp y te ayudamos con tu pedido.
            </p>
            <a
              href="https://wa.me/16572621801"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs font-semibold text-green-600 hover:text-green-700"
            >
              Contactar por WhatsApp →
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

function OrderCard({ order }) {
  const [showItems, setShowItems] = useState(false)
  const stepIndex = getStepIndex(order.status)
  const historyMap = {}
  ;(order.history || []).forEach(h => { historyMap[h.status] = h })
  const shortId = order.id?.slice(-6).toUpperCase()
  const date = new Date(order.created_at).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400">{date} · #{shortId}</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{order.customer_name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-sm font-bold text-gray-900">${order.total?.toFixed(2)}</p>
        </div>
      </div>

      {/* Tracking number destacado */}
      {order.tracking_number && stepIndex >= 3 && (
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600">Número de guía</p>
            <p className="text-base font-mono font-bold text-blue-900 tracking-wider mt-0.5">
              {order.tracking_number}
            </p>
          </div>
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
        </div>
      )}

      {/* Timeline vertical */}
      <div className="px-5 py-4">
        {STATUS_STEPS.map((step, i) => {
          const done = i <= stepIndex
          const current = i === stepIndex
          const isLast = i === STATUS_STEPS.length - 1
          const histEntry = historyMap[step.key]

          return (
            <div key={step.key} className="flex gap-3">
              {/* Dot + línea */}
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  done ? 'bg-black' : 'bg-gray-100'
                }`}>
                  {i < stepIndex ? (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : current ? (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  ) : null}
                </div>
                {!isLast && (
                  <div className={`w-0.5 my-1 ${i < stepIndex ? 'bg-black' : 'bg-gray-100'}`}
                    style={{ height: '20px' }} />
                )}
              </div>
              {/* Texto */}
              <div className={`pb-1 ${isLast ? '' : 'mb-1'}`}>
                <p className={`text-sm font-semibold leading-tight ${done ? 'text-gray-900' : 'text-gray-300'}`}>
                  {step.label}
                </p>
                {histEntry && (
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(histEntry.timestamp)}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Items del pedido (colapsable) */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowItems(v => !v)}
          className="w-full px-5 py-3 flex items-center justify-between text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <span>{(order.items || []).length} producto{(order.items || []).length !== 1 ? 's' : ''}</span>
          <span>{showItems ? '▲ Ocultar' : '▼ Ver detalle'}</span>
        </button>
        {showItems && (
          <div className="px-5 pb-4 space-y-2">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                {item.imagen_url && (
                  <img
                    src={item.imagen_url}
                    alt={item.nombre}
                    className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {item.nombre}{item.size ? ` — ${item.size}` : ''}
                  </p>
                  <p className="text-xs text-gray-400">{item.qty} u. × ${item.unit_price?.toFixed(2)}</p>
                </div>
                <p className="text-xs font-bold text-gray-900 shrink-0">
                  ${(item.qty * item.unit_price).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
