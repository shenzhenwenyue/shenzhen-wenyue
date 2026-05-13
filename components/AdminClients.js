'use client'
import { useState, useMemo } from 'react'

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  paid: 'Pagado',
  shipped: 'Enviado',
  completed: 'Completado',
}

const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  shipped:   'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-500',
}

function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
}

function timeAgo(dateStr) {
  const d = daysSince(dateStr)
  if (d === 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d} días`
  if (d < 60) return 'hace ~1 mes'
  return `hace ${Math.floor(d / 30)} meses`
}

export default function AdminClients({ orders }) {
  const [sort, setSort] = useState('total')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [expandedOrder, setExpandedOrder] = useState(null)

  const clients = useMemo(() => {
    const map = {}
    for (const order of orders) {
      const key = order.customer_whatsapp?.replace(/\D/g, '') || order.customer_name
      if (!map[key]) {
        map[key] = {
          key,
          whatsapp: order.customer_whatsapp,
          name: order.customer_name,
          orders: [],
          total: 0,
          lastOrderDate: null,
          email: null,
        }
      }
      const client = map[key]
      client.orders.push(order)
      client.total += order.total || 0
      if (!client.lastOrderDate || new Date(order.created_at) > new Date(client.lastOrderDate)) {
        client.lastOrderDate = order.created_at
        client.name = order.customer_name
        if (order.customer_email) client.email = order.customer_email
      }
    }
    return Object.values(map)
  }, [orders])

  const sorted = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = q
      ? clients.filter(c => c.name.toLowerCase().includes(q) || c.whatsapp?.includes(q))
      : clients
    return [...filtered].sort((a, b) => {
      if (sort === 'total') return b.total - a.total
      if (sort === 'recent') return new Date(b.lastOrderDate) - new Date(a.lastOrderDate)
      if (sort === 'orders') return b.orders.length - a.orders.length
      return 0
    })
  }, [clients, sort, search])

  const atRisk = clients.filter(c => daysSince(c.lastOrderDate) >= 60).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Clientes</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {clients.length} cliente{clients.length !== 1 ? 's' : ''} · {orders.length} pedidos totales
          </p>
        </div>
        {atRisk > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-1.5 text-right">
            <p className="text-xs font-bold text-orange-600">{atRisk} en riesgo</p>
            <p className="text-xs text-orange-400">sin pedir en 60+ días</p>
          </div>
        )}
      </div>

      {/* Search + sort */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente…"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 bg-white"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 bg-white text-gray-700"
        >
          <option value="total">Mayor gasto</option>
          <option value="recent">Más reciente</option>
          <option value="orders">Más pedidos</option>
        </select>
      </div>

      {/* Client list */}
      <div className="space-y-2">
        {sorted.map(client => {
          const days = daysSince(client.lastOrderDate)
          const isAtRisk = days >= 60
          const isOpen = expanded === client.key
          const activeOrders = client.orders.filter(o => !['completed'].includes(o.status))
          const statusCounts = client.orders.reduce((acc, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1
            return acc
          }, {})

          return (
            <div key={client.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Card header */}
              <button
                onClick={() => setExpanded(isOpen ? null : client.key)}
                className="w-full px-4 py-3 flex items-start justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-gray-900">{client.name}</span>
                    {isAtRisk && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">
                        En riesgo
                      </span>
                    )}
                    {activeOrders.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                        {activeOrders.length} activo{activeOrders.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {client.orders.length} pedido{client.orders.length !== 1 ? 's' : ''} · último {timeAgo(client.lastOrderDate)}
                  </p>
                  {client.email && (
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{client.email}</p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-gray-900">${client.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-gray-400">total comprado</p>
                </div>
              </button>

              {/* Expanded */}
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  {/* Status breakdown */}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <span key={status} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'}`}>
                        {count} {STATUS_LABELS[status] || status}
                      </span>
                    ))}
                  </div>

                  {/* Order history */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500">Historial de pedidos</p>
                    {[...client.orders]
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                      .map(order => {
                        const isOrderOpen = expandedOrder === order.id
                        const confirmedItems = (order.items || []).filter(i => i.confirmed !== false)
                        const rejectedItems = (order.items || []).filter(i => i.confirmed === false)
                        return (
                          <div key={order.id} className="border border-gray-100 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandedOrder(isOrderOpen ? null : order.id)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                                  {STATUS_LABELS[order.status]}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="text-xs text-gray-400">
                                  · {(order.items || []).length} producto{(order.items || []).length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-semibold text-gray-700">${(order.total || 0).toFixed(0)}</span>
                                <svg
                                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOrderOpen ? 'rotate-180' : ''}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            {isOrderOpen && (
                              <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 space-y-2">
                                {/* Confirmed items */}
                                {confirmedItems.length > 0 && (
                                  <div className="space-y-1">
                                    {confirmedItems.map((item, idx) => (
                                      <div key={idx} className="flex items-start gap-2">
                                        {item.imagen_url && (
                                          <img
                                            src={item.imagen_url}
                                            alt={item.nombre}
                                            className="w-8 h-8 object-cover rounded-lg shrink-0 bg-white"
                                            onError={e => { e.target.style.display = 'none' }}
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-gray-800 leading-tight truncate">{item.nombre}</p>
                                          <p className="text-xs text-gray-400">
                                            {[item.size, item.subcategoria].filter(Boolean).join(' · ')}
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="text-xs font-semibold text-gray-700">×{item.qty}</p>
                                          <p className="text-xs text-gray-400">${(item.unit_price || 0).toFixed(0)} c/u</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Rejected items */}
                                {rejectedItems.length > 0 && (
                                  <div className="pt-1 border-t border-gray-200">
                                    <p className="text-xs text-gray-400 mb-1">No disponibles ({rejectedItems.length})</p>
                                    {rejectedItems.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-2 opacity-50">
                                        <p className="text-xs text-gray-500 line-through truncate flex-1">{item.nombre}</p>
                                        <p className="text-xs text-gray-400 shrink-0">×{item.qty}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Totals row */}
                                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                                  <span className="text-xs text-gray-500">
                                    Envío: ${(order.shipping_cost ?? 12).toFixed(0)}
                                  </span>
                                  <span className="text-xs font-bold text-gray-800">
                                    Total: ${(order.total || 0).toFixed(0)}
                                  </span>
                                </div>

                                {order.tracking_number && (
                                  <p className="text-xs text-purple-600 font-medium">
                                    Rastreo: {order.tracking_number}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <a
                      href={`https://wa.me/${client.whatsapp?.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 bg-green-500 text-white text-xs font-semibold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </a>
                    {client.email && (
                      <a
                        href={`mailto:${client.email}`}
                        className="flex-1 py-2 bg-gray-800 text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Correo
                      </a>
                    )}
                    {isAtRisk && (
                      <a
                        href={`https://wa.me/${client.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi *${client.name}*! How are you? We have new products available. Would you like to check the catalog?`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-1.5"
                      >
                        Reactivar por WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {sorted.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No hay clientes que coincidan</p>
          </div>
        )}
      </div>
    </div>
  )
}
