'use client'
import { useState, useEffect } from 'react'
import { getCosto } from '@/lib/pricing'
import { DEFAULT_SHIPPING } from '@/lib/constants'

const WHATSAPP = '16613737977'

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  paid: 'Pagado',
  shipped: 'Enviado',
  completed: 'Completado',
}

export default function AdminOrderCard({ order: initialOrder, adminPassword, onDelete, products = [] }) {
  const [order, setOrder] = useState(initialOrder)
  const [saving, setSaving] = useState(false)
  const [partialQtys, setPartialQtys] = useState({})
  const [shipping, setShipping] = useState(order.shipping_cost != null ? String(order.shipping_cost) : String(DEFAULT_SHIPPING))
  const [trackingInput, setTrackingInput] = useState(order.tracking_number || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState(false)
  const [expanded, setExpanded] = useState(order.status === 'pending')
  const [costInputs, setCostInputs] = useState(() => {
    const byIdx = {}
    order.items.forEach((item, i) => { byIdx[i] = item.unit_cost ?? '' })
    return byIdx
  })
  const [costFromRules, setCostFromRules] = useState(new Set())
  const [savingCosts, setSavingCosts] = useState(false)
  const [editingCosts, setEditingCosts] = useState(false)
  const [costoEnvioReal, setCostoEnvioReal] = useState(
    order.costo_envio_real != null ? String(order.costo_envio_real) : ''
  )

  // Sync local states when parent re-renders with updated order (polling)
  useEffect(() => {
    setOrder(initialOrder)
    setShipping(initialOrder.shipping_cost != null ? String(initialOrder.shipping_cost) : String(DEFAULT_SHIPPING))
    setTrackingInput(initialOrder.tracking_number || '')
    setAdminNote(initialOrder.admin_notes || '')
    setCostoEnvioReal(initialOrder.costo_envio_real != null ? String(initialOrder.costo_envio_real) : '')
    setCostInputs(() => {
      const byIdx = {}
      initialOrder.items.forEach((item, i) => { byIdx[i] = item.unit_cost ?? '' })
      return byIdx
    })
  }, [initialOrder.id, initialOrder.updated_at])
  const [stockMap, setStockMap] = useState({})

  useEffect(() => {
    const pwd = sessionStorage.getItem('adminPassword')
    fetch('/api/admin/inventory', { headers: { 'x-admin-password': pwd } })
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        if (!Array.isArray(rows)) return
        const names = new Set(order.items.map(i => i.nombre))
        const map = {}
        rows.forEach(r => { if (names.has(r.nombre)) map[r.nombre] = r.stock })
        setStockMap(map)
      })
    fetch('/api/admin/costs', { headers: { 'x-admin-password': pwd } })
      .then(r => r.ok ? r.json() : [])
      .then(rules => {
        if (!Array.isArray(rules) || rules.length === 0) return
        const ruleIndices = new Set()
        const updatedInputs = {}
        const updatedItems = order.items.map(item => ({ ...item }))
        let anyNewFromRules = false

        order.items.forEach((item, i) => {
          if (item.unit_cost != null) {
            updatedInputs[i] = String(item.unit_cost)
            return
          }
          const totalCategoryQty = order.items
            .filter(it => it.categoria === item.categoria)
            .reduce((s, it) => s + it.qty, 0)
          const costo = getCosto(rules, item, totalCategoryQty)
          if (costo !== null) {
            updatedInputs[i] = String(costo)
            ruleIndices.add(i)
            updatedItems[i] = { ...item, unit_cost: costo }
            anyNewFromRules = true
          } else {
            updatedInputs[i] = ''
          }
        })

        setCostInputs(updatedInputs)
        setCostFromRules(ruleIndices)

        if (anyNewFromRules) {
          const allCovered = order.items.every((item, i) =>
            item.unit_cost != null || ruleIndices.has(i)
          )
          if (allCovered) patch({ items: updatedItems })
        }
      })
  }, [])
  const [showHistory, setShowHistory] = useState(false)
  const [editingItems, setEditingItems] = useState(false)
  const [editItems, setEditItems] = useState(order.items)
  const [adminNote, setAdminNote] = useState(order.admin_notes || '')
  const [savingNote, setSavingNote] = useState(false)
  const [paymentLink, setPaymentLink] = useState('')
  const [replacements, setReplacements] = useState({}) // { itemIndex: { nombre, imagen_url, unit_price } }
  const [sendingCotizacion, setSendingCotizacion] = useState(false)
  const [exportSelected, setExportSelected] = useState(null) // null = todos los confirmados; Set<idx> = selección manual

  const allReviewed = order.items.every(i => i.confirmed !== null)
  const confirmedItems = order.items.filter(i => i.confirmed !== false)

  const shippingCost = parseFloat(shipping) || 0
  const confirmedTotal = confirmedItems.reduce((sum, i) => sum + (i.available_qty ?? i.qty) * i.unit_price, 0) + shippingCost

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
      if (res.ok) {
        setOrder(data)
        if (updates.status && updates.status !== 'pending') setExpanded(false)
      } else {
        alert(`Error al guardar: ${data.error || 'Error desconocido'}`)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCosts() {
    setSavingCosts(true)
    const updatedItems = order.items.map((item, i) => {
      const val = parseFloat(costInputs[i])
      return { ...item, unit_cost: isNaN(val) ? (item.unit_cost ?? null) : val }
    })
    await patch({ items: updatedItems })
    setSavingCosts(false)
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

  async function handleConfirmarTodo() {
    const updatedItems = order.items.map(item => ({
      ...item,
      confirmed: item.confirmed === false ? false : true,
      available_qty: item.confirmed === false ? item.available_qty : item.qty,
    }))
    await patch({ items: updatedItems })
  }

  async function handleEnviarCotizacion() {
    setSendingCotizacion(true)
    try {
      const { generarCotizacionPDF } = await import('@/lib/pdf')
      const doc = await generarCotizacionPDF(order, replacements, shippingCost)
      const pdfBase64 = doc.output('datauristring').split(',')[1]

      const res = await fetch(`/api/orders/${order.id}/quote-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ pdfBase64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir PDF')

      const pdfUrl = data.url
      const hayReemplazos = Object.values(replacements).some(r => r?.nombre)
      const unavailable = order.items.filter(i => i.confirmed === false)

      // Total = items confirmados + todas las sugerencias de reemplazo
      const subtotalReemplazos = Object.values(replacements).reduce((s, sug) =>
        s + (sug || []).reduce((rs, r) => rs + r.qty * (r.unit_price || 0), 0), 0
      )
      const totalCotizacion = confirmedTotal + subtotalReemplazos

      const available = order.items.filter(i => i.confirmed !== false)
      // Items con reemplazos sugeridos (no hay O parcial con sugerencias)
      const itemsConSugerencias = order.items.filter((item, idx) => (replacements[idx] || []).length > 0)
      const hayReemplazosNuevos = itemsConSugerencias.length > 0

      let msg = `Hola *${order.customer_name}*! Revisamos tu pedido y aquí está tu cotización:\n\n`

      // Disponibles (sin reemplazos)
      const puroDisponible = available.filter((item) => {
        const idx = order.items.indexOf(item)
        return (replacements[idx] || []).length === 0
      })
      if (puroDisponible.length > 0) {
        msg += `✅ *Disponible:*\n`
        puroDisponible.forEach(item => {
          const qty = item.available_qty ?? item.qty
          msg += `• ${qty}× ${item.nombre}${item.size ? ` (${item.size})` : ''} — $${(qty * item.unit_price).toFixed(2)}\n`
        })
        msg += `\n`
      }

      // Items con sugerencias (parcial o sin stock)
      if (itemsConSugerencias.length > 0) {
        msg += `🔄 *Cambios sugeridos:*\n`
        itemsConSugerencias.forEach(item => {
          const idx = order.items.indexOf(item)
          const sug = replacements[idx] || []
          const availQty = item.confirmed === true ? (item.available_qty ?? 0) : 0
          msg += `• ~~${item.qty}× ${item.nombre}~~\n`
          if (availQty > 0) msg += `   ✓ ${availQty}× disponibles del original\n`
          sug.forEach(r => {
            msg += `   ↳ ${r.qty}× *${r.nombre}* — $${(r.qty * r.unit_price).toFixed(2)}\n`
          })
        })
        msg += `\n`
      }

      // Sin stock y sin sugerencia
      const sinStockSinRep = unavailable.filter(item => {
        const idx = order.items.indexOf(item)
        return (replacements[idx] || []).length === 0
      })
      if (sinStockSinRep.length > 0) {
        msg += `❌ *Sin stock:*\n`
        sinStockSinRep.forEach(item => { msg += `• ${item.nombre}\n` })
        msg += `\n`
      }

      msg += `📋 Cotización completa con imágenes: ${pdfUrl}\n\n`
      msg += `*Total: $${totalCotizacion.toFixed(2)}*${hayReemplazosNuevos ? ' _(incluyendo alternativas)_' : ''}`

      if (hayReemplazosNuevos) {
        msg += `\n\n¿Confirmamos con los cambios sugeridos o prefieres ajustar algo?`
      } else if (unavailable.length > 0) {
        msg += `\n\n¿Confirmamos el pedido con los productos disponibles?`
      } else if (paymentLink.trim()) {
        msg += `\n\n💳 *Enlace de pago:*\n${paymentLink.trim()}`
      } else {
        msg += `\n\n¿Confirmamos el pedido? Te enviamos los datos de pago.`
      }

      window.open(`https://wa.me/${order.customer_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
    } catch (err) {
      alert('Error al generar cotización: ' + err.message)
    } finally {
      setSendingCotizacion(false)
    }
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
      onDelete?.(order.id)
      setOrder(null)
    }
    setSaving(false)
  }

  function exportarOrden(items, proveedor = null) {
    if (items.length === 0) return
    const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    let msg = `*ORDEN DE COMPRA — Shenzhen Wenyue*\n`
    if (proveedor) msg += `Proveedor: ${proveedor}\n`
    msg += `Fecha: ${fecha}\n`
    msg += `Pedido: #${order.id.substring(0, 8).toUpperCase()}\n\n`
    items.forEach(item => {
      const qty = item.available_qty ?? item.qty
      const sku = item.sku ? `[${item.sku}] ` : ''
      msg += `• ${sku}${item.nombre} — ${qty} u.\n`
    })
    msg += `\nTotal unidades: ${items.reduce((s, i) => s + (i.available_qty ?? i.qty), 0)}`
    navigator.clipboard?.writeText(msg)
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function getExportItems(skuFilter = null) {
    const base = exportSelected === null
      ? confirmedItems
      : order.items.filter((_, i) => exportSelected.has(i))
    return skuFilter ? base.filter(skuFilter) : base
  }

  function toggleExportItem(idx) {
    setExportSelected(prev => {
      const confirmedIndices = new Set(
        order.items.map((_, i) => i).filter(i => order.items[i].confirmed !== false)
      )
      const base = prev ?? confirmedIndices
      const next = new Set(base)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      if (next.size === confirmedIndices.size && [...next].every(i => confirmedIndices.has(i))) return null
      return next
    })
  }

  function handleOrdenProveedor() {
    exportarOrden(getExportItems())
  }

  function handleOrdenLucy() {
    exportarOrden(getExportItems(i => i.sku?.toUpperCase().startsWith('XP')), 'Lucy')
  }

  function handleOrdenJoy() {
    exportarOrden(getExportItems(i => i.sku?.toUpperCase().startsWith('S')), 'Joy')
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

  const canDelete = ['pending', 'confirmed', 'shipped', 'completed'].includes(order.status)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header — siempre visible, clickeable para expandir */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-4 py-3 border-b border-gray-100 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900">{order.customer_name}</span>
            <StatusBadge status={order.status} />
            {!expanded && (
              <span className="text-xs text-gray-400 font-normal">
                {order.items.length} producto{order.items.length !== 1 ? 's' : ''} · ${(order.total || 0).toFixed(2)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {fecha} · #{order.id.substring(0, 8).toUpperCase()}
            {order.admin_notes && <span className="ml-2 text-amber-500" title={order.admin_notes}>📝</span>}
          </p>
          {order.tracking_number && (
            <p className="text-xs text-blue-600 mt-0.5">Tracking: {order.tracking_number}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <a
            href={`https://wa.me/${order.customer_whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-green-600 font-medium flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Items + Footer — colapsable */}
      {expanded && <><div className="divide-y divide-gray-50">
        {order.status === 'pending' && (() => {
          const cats = [...new Set(order.items.map(i => i.categoria).filter(Boolean))]
          return (
            <div className="px-4 py-2 border-b border-gray-100 space-y-2">
              {cats.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {cats.map(cat => {
                    const catIndices = order.items.map((it, idx) => ({ it, idx })).filter(({ it }) => it.categoria === cat).map(({ idx }) => idx)
                    const allSelected = catIndices.every(i =>
                      exportSelected === null ? order.items[i].confirmed !== false : exportSelected.has(i)
                    )
                    return (
                      <button
                        key={cat}
                        onClick={() => setExportSelected(prev => {
                          const confirmedIndices = new Set(order.items.map((_, i) => i).filter(i => order.items[i].confirmed !== false))
                          const base = new Set(prev ?? confirmedIndices)
                          if (allSelected) catIndices.forEach(i => base.delete(i))
                          else catIndices.forEach(i => base.add(i))
                          if (base.size === confirmedIndices.size && [...base].every(i => confirmedIndices.has(i))) return null
                          return base
                        })}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          allSelected ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {cat} <span className="opacity-60">({catIndices.length})</span>
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleConfirmarTodo}
                  disabled={saving}
                  className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-40 flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirmar todo disponible
                </button>
              </div>
            </div>
          )
        })()}
        {order.items.map((item, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {order.status === 'pending' && (
                  <input
                    type="checkbox"
                    checked={exportSelected === null ? item.confirmed !== false : exportSelected.has(i)}
                    onChange={() => toggleExportItem(i)}
                    className="mt-1 shrink-0 accent-gray-800"
                    title="Incluir en exportación al proveedor"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                  <p className="text-xs text-gray-400">{item.categoria} · {item.qty} u. · ${item.unit_price.toFixed(2)} c/u</p>
                  {stockMap[item.nombre] != null && (
                    <p className="mt-1 text-xs text-gray-400">Stock: {stockMap[item.nombre]}</p>
                  )}
                </div>
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

            {/* Reemplazos — visible cuando no hay stock o hay stock parcial */}
            {order.status === 'pending' && (
              item.confirmed === false ||
              (item.confirmed === true && item.available_qty != null && item.available_qty < item.qty)
            ) && (
              <ReplacementSection
                item={item}
                products={products}
                suggestions={replacements[i] || []}
                onChange={sug => setReplacements(prev => ({ ...prev, [i]: sug }))}
              />
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

      {/* Desglose financiero — solo en pedidos completados */}
      {order.status === 'completed' && (() => {
        const items = confirmedItems.map(item => {
          const qty = item.available_qty ?? item.qty
          const venta = qty * item.unit_price
          const costo = item.unit_cost != null ? qty * item.unit_cost : null
          const ganancia = costo != null ? venta - costo : null
          const margen = ganancia != null && venta > 0 ? (ganancia / venta) * 100 : null
          return { ...item, qty, venta, costo, ganancia, margen }
        })
        const totalVentaProductos = items.reduce((s, i) => s + i.venta, 0)
        const envioCliente = order.shipping_cost || 0
        const totalCobrado = totalVentaProductos + envioCliente
        const totalCostoProductos = items.every(i => i.costo != null)
          ? items.reduce((s, i) => s + i.costo, 0)
          : null
        const envioReal = order.costo_envio_real || 0
        const totalCostos = totalCostoProductos != null ? totalCostoProductos + envioReal : null
        const gananciaNet = totalCostos != null ? totalCobrado - totalCostos : null
        const margenNet = gananciaNet != null && totalCobrado > 0 ? (gananciaNet / totalCobrado) * 100 : null
        const sinCosto = items.some(i => i.costo == null)

        return (
          <div className="mx-4 my-3 rounded-2xl border border-gray-200 overflow-hidden text-xs">
            {/* Header */}
            <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold text-sm">Desglose financiero</span>
              <span className="text-gray-400">#{order.id.substring(0, 8).toUpperCase()}</span>
            </div>

            {/* Por producto */}
            <div className="divide-y divide-gray-100">
              {items.map((item, i) => (
                <div key={i} className="px-4 py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{item.nombre}</p>
                    <p className="text-gray-400 mt-0.5">
                      {item.qty} pz · ${item.unit_price.toFixed(2)}/u = <span className="text-gray-700 font-semibold">${item.venta.toFixed(2)}</span>
                      {item.unit_cost != null && (
                        <> · costo ${item.unit_cost.toFixed(2)}/u = ${item.costo.toFixed(2)}</>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {item.ganancia != null ? (
                      <>
                        <p className={`font-bold ${item.ganancia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {item.ganancia >= 0 ? '+' : ''}${item.ganancia.toFixed(2)}
                        </p>
                        <p className="text-gray-400">{item.margen.toFixed(0)}%</p>
                      </>
                    ) : (
                      <p className="text-gray-300 italic">sin costo</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen totales */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-gray-600">
                <span>Venta de productos</span>
                <span className="font-medium text-gray-800">${totalVentaProductos.toFixed(2)}</span>
              </div>
              {envioCliente > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>+ Envío cobrado</span>
                  <span className="font-medium text-gray-800">${envioCliente.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                <span>Total cobrado</span>
                <span>${totalCobrado.toFixed(2)}</span>
              </div>

              {totalCostoProductos != null && (
                <>
                  <div className="flex justify-between text-gray-600 pt-1">
                    <span>− Costo productos</span>
                    <span className="font-medium text-gray-800">${totalCostoProductos.toFixed(2)}</span>
                  </div>
                  {envioReal > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>− Costo envío real</span>
                      <span className="font-medium text-gray-800">${envioReal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-gray-300 pt-2 mt-1">
                    <span className="font-bold text-gray-900">Ganancia neta</span>
                    <div className="text-right">
                      <p className={`text-base font-black ${gananciaNet >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {gananciaNet >= 0 ? '+' : ''}${gananciaNet.toFixed(2)}
                      </p>
                      <p className={`font-semibold ${gananciaNet >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {margenNet.toFixed(1)}% margen
                      </p>
                    </div>
                  </div>
                </>
              )}

              {sinCosto && (
                <p className="text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mt-1">
                  Faltan costos en algunos productos — ganancia incompleta.
                </p>
              )}
            </div>
          </div>
        )
      })()}

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-2">

        {/* Costos — colapsable */}
        {(() => {
          const allCostsSet = order.items.every(item => item.unit_cost != null)
          const pendingCount = order.items.filter(item => item.unit_cost == null).length
          return (
            <button
              onClick={() => setEditingCosts(v => !v)}
              className={`w-full py-1.5 border text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                editingCosts
                  ? 'border-gray-300 bg-gray-100 text-gray-700'
                  : allCostsSet
                    ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    : 'border-amber-200 text-amber-700 hover:bg-amber-50'
              }`}
            >
              {editingCosts ? 'Cerrar costos' : allCostsSet ? '✓ Costos completos' : `Costos — ${pendingCount} sin capturar`}
            </button>
          )
        })()}
        {editingCosts && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {order.items.map((item, i) => {
              const qty = item.available_qty ?? item.qty
              const revenue = qty * item.unit_price
              const costo = parseFloat(costInputs[i])
              const ganancia = !isNaN(costo) ? revenue - costo * qty : null
              const needsManual = (costInputs[i] === '' || costInputs[i] == null) && !costFromRules.has(i)
              return (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0 ${needsManual ? 'bg-amber-50' : ''}`}>
                  <p className={`flex-1 text-xs truncate min-w-0 ${needsManual ? 'text-amber-800 font-medium' : 'text-gray-700'}`}>{item.nombre}</p>
                  <div className="relative shrink-0">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costInputs[i] ?? ''}
                      onChange={e => {
                        setCostInputs(prev => ({ ...prev, [i]: e.target.value }))
                        setCostFromRules(prev => { const n = new Set(prev); n.delete(i); return n })
                      }}
                      placeholder="$0.00"
                      className={`w-20 px-2 py-1 rounded-lg text-xs text-center focus:outline-none transition-colors ${
                        needsManual
                          ? 'border border-amber-300 bg-amber-50 focus:border-amber-500'
                          : costFromRules.has(i)
                            ? 'border border-blue-300 bg-blue-50 text-blue-700 focus:border-blue-500'
                            : 'border border-gray-200 focus:border-gray-400'
                      }`}
                    />
                    {costFromRules.has(i) && (
                      <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-blue-500 text-white rounded-full px-1 leading-tight">R</span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold w-14 text-right shrink-0 ${ganancia == null ? 'text-gray-300' : ganancia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {ganancia != null ? `${ganancia >= 0 ? '+' : ''}$${ganancia.toFixed(0)}` : '—'}
                  </span>
                </div>
              )
            })}
            <div className="px-3 py-2 bg-gray-50 flex gap-2">
              <button
                onClick={handleSaveCosts}
                disabled={savingCosts}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {savingCosts ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditingCosts(false)}
                className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Envío — visible en todos los estados activos */}
        {order.status !== 'completed' && (
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
            <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
              <span>Total{order.status === 'pending' ? (allReviewed ? ' confirmado' : ' estimado') : ' real'}</span>
              <span>${confirmedTotal.toFixed(2)}</span>
            </div>
            {order.status !== 'pending' && (
              <button
                onClick={() => patch({ shipping_cost: shippingCost, total: confirmedTotal })}
                disabled={saving}
                className="w-full py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar costo de envío'}
              </button>
            )}
          </div>
        )}

        {/* Costo real de envío — solo interno, visible desde paid */}
        {['paid', 'shipped', 'completed'].includes(order.status) && (
          <div className="border border-dashed border-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500">Costo real de envío</p>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Solo interno</span>
            </div>
            <p className="text-xs text-gray-400">Lo que tú pagas al paquetero. No se muestra al cliente ni en el PDF.</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costoEnvioReal}
                onChange={e => setCostoEnvioReal(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={() => patch({ costo_envio_real: parseFloat(costoEnvioReal) || 0 })}
                disabled={saving}
                className="px-3 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? '…' : 'Guardar'}
              </button>
            </div>
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
          {order.status === 'pending' && (
            <>
              <button
                onClick={handleOrdenProveedor}
                className="w-full py-2 bg-gray-800 text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors"
              >
                Exportar orden para proveedor
              </button>
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleOrdenLucy}
                  disabled={!confirmedItems.some(i => i.sku?.toUpperCase().startsWith('XP'))}
                  className="flex-1 py-2 bg-violet-600 text-white text-xs font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Lucy (XP) — {confirmedItems.filter(i => i.sku?.toUpperCase().startsWith('XP')).length} items
                </button>
                <button
                  onClick={handleOrdenJoy}
                  disabled={!confirmedItems.some(i => i.sku?.toUpperCase().startsWith('S'))}
                  className="flex-1 py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Joy (S) — {confirmedItems.filter(i => i.sku?.toUpperCase().startsWith('S')).length} items
                </button>
              </div>
              <div className="w-full space-y-1.5">
                <input
                  type="url"
                  value={paymentLink}
                  onChange={e => setPaymentLink(e.target.value)}
                  placeholder="Enlace de pago (opcional — se incluye si todo está disponible)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-gray-400"
                />
                <button
                  onClick={handleEnviarCotizacion}
                  disabled={sendingCotizacion}
                  className="w-full py-2.5 bg-green-500 text-white text-xs font-bold rounded-xl hover:bg-green-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {sendingCotizacion ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Generando PDF…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Enviar Cotización PDF
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={() => patch({ status: 'confirmed', shipping_cost: shippingCost, total: confirmedTotal })}
                disabled={saving}
                className="w-full py-2 bg-blue-500 text-white text-xs font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                Marcar como Confirmado
              </button>
            </>
          )}

          {order.status === 'confirmed' && (
            <button
              onClick={() => patch({ status: 'paid' })}
              disabled={saving}
              className="w-full py-2 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              Marcar Pagado
            </button>
          )}

          {order.status === 'paid' && (
            <button
              onClick={() => {
                if (!trackingInput.trim() || saving) return
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
              Completar
            </button>
          )}

          {/* Revertir estado */}
          {order.status === 'confirmed' && (
            <button
              onClick={() => patch({ status: 'pending' })}
              disabled={saving}
              className="w-full py-2 border border-gray-200 text-gray-500 text-xs font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              ← Regresar a Pendiente
            </button>
          )}
          {order.status === 'paid' && (
            <button
              onClick={() => patch({ status: 'confirmed' })}
              disabled={saving}
              className="w-full py-2 border border-gray-200 text-gray-500 text-xs font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              ← Regresar a Confirmado
            </button>
          )}
          {order.status === 'shipped' && (
            <button
              onClick={() => patch({ status: 'paid' })}
              disabled={saving}
              className="w-full py-2 border border-gray-200 text-gray-500 text-xs font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              ← Regresar a Pagado
            </button>
          )}
          {order.status === 'completed' && (
            <button
              onClick={() => patch({ status: 'shipped' })}
              disabled={saving}
              className="w-full py-2 border border-gray-200 text-gray-500 text-xs font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              ← Regresar a Enviado
            </button>
          )}

          {/* Eliminar pedido */}
          {canDelete && !showDeleteConfirm && (
            <button
              onClick={() => { setShowDeleteConfirm(true); setDeleteError(false); setDeletePassword('') }}
              className={`w-full py-2 text-xs font-semibold rounded-xl transition-colors ${
                order.status === 'pending'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'border border-red-200 text-red-400 hover:bg-red-50'
              }`}
            >
              {order.status === 'pending' ? 'Rechazar pedido' : 'Eliminar pedido'}
            </button>
          )}

          {showDeleteConfirm && (
            <div className="border border-red-200 rounded-xl p-3 space-y-2 bg-red-50">
              <p className="text-xs text-red-600 font-medium">
                {order.status === 'pending' ? 'Confirma tu contraseña para rechazar este pedido' : 'Confirma tu contraseña para eliminar'}
              </p>
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

        {/* Editor de items */}
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <button
            onClick={() => { setEditingItems(v => !v); setEditItems(order.items) }}
            className="w-full py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {editingItems ? 'Cancelar edición' : 'Editar items del pedido'}
          </button>

          {editingItems && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              {editItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-gray-700 truncate">{item.nombre}{item.size ? ` (${item.size})` : ''}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditItems(prev => {
                        const updated = [...prev]
                        if (updated[i].qty <= 1) return prev.filter((_, idx) => idx !== i)
                        updated[i] = { ...updated[i], qty: updated[i].qty - 1 }
                        return updated
                      })}
                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs font-bold"
                    >−</button>
                    <span className="w-6 text-center text-xs font-semibold">{item.qty}</span>
                    <button
                      onClick={() => setEditItems(prev => {
                        const updated = [...prev]
                        updated[i] = { ...updated[i], qty: updated[i].qty + 1 }
                        return updated
                      })}
                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs font-bold"
                    >+</button>
                    <button
                      onClick={() => setEditItems(prev => prev.filter((_, idx) => idx !== i))}
                      className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-500 text-xs font-bold ml-1"
                    >×</button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  patch({ items: editItems })
                  setEditingItems(false)
                  setCostInputs(() => {
                    const byIdx = {}
                    editItems.forEach((item, i) => { byIdx[i] = item.unit_cost ?? '' })
                    return byIdx
                  })
                }}
                disabled={saving || editItems.length === 0}
                className="w-full py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors mt-1"
              >Guardar cambios</button>
            </div>
          )}
        </div>

        {/* Nota interna */}
        <div className="border-t border-gray-100 pt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">📝 Nota interna</p>
            {order.admin_notes && adminNote === order.admin_notes && (
              <span className="text-xs text-gray-400">Guardada</span>
            )}
          </div>
          <textarea
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            placeholder="Solo visible en el panel admin…"
            rows={2}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 resize-none"
          />
          <button
            onClick={async () => {
              setSavingNote(true)
              await patch({ admin_notes: adminNote })
              setSavingNote(false)
            }}
            disabled={savingNote || adminNote === (order.admin_notes || '')}
            className="w-full py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            {savingNote ? 'Guardando…' : 'Guardar nota'}
          </button>
        </div>

        {/* Historial */}
        {order.history?.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showHistory ? 'Ocultar historial' : `Ver historial (${order.history.length})`}
            </button>
            {showHistory && (
              <div className="mt-2 space-y-2">
                {order.history.map((entry, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-700 font-medium">{entry.action}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(entry.timestamp).toLocaleDateString('es-MX', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </>}
    </div>
  )
}

function ReplacementSection({ item, products, suggestions, onChange }) {
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const availQty = item.confirmed === true ? (item.available_qty ?? 0) : 0
  const originalQty = item.qty
  const coveredPcs = availQty + suggestions.reduce((s, r) => s + r.qty, 0)
  const remaining = originalQty - coveredPcs

  const filtered = query.length >= 2
    ? products.filter(p => p.nombre?.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : []

  function addSuggestion(p) {
    const defaultQty = Math.max(1, remaining > 0 ? remaining : 1)
    onChange([...suggestions, { nombre: p.nombre, imagen_url: p.imagen_url || null, unit_price: p.precio_1 || 0, qty: defaultQty }])
    setQuery('')
    setShowSearch(false)
  }

  function updateQty(si, delta) {
    onChange(suggestions.map((s, i) => i === si ? { ...s, qty: Math.max(1, s.qty + delta) } : s))
  }

  function remove(si) {
    onChange(suggestions.filter((_, i) => i !== si))
  }

  const progressColor = coveredPcs < originalQty ? 'text-red-500' : coveredPcs === originalQty ? 'text-green-600' : 'text-amber-500'
  const progressLabel = coveredPcs === 0 ? null
    : coveredPcs < originalQty ? `${coveredPcs}/${originalQty} pcs — faltan ${remaining}`
    : coveredPcs === originalQty ? `✓ ${originalQty}/${originalQty} pcs completo`
    : `${coveredPcs}/${originalQty} pcs — ${coveredPcs - originalQty} extra`

  return (
    <div className="mt-2 pl-3 border-l-2 border-amber-200 space-y-1.5">
      {progressLabel && (
        <p className={`text-xs font-semibold ${progressColor}`}>{progressLabel}</p>
      )}

      {suggestions.map((sug, si) => (
        <div key={si} className="flex items-center gap-1.5">
          {sug.imagen_url
            ? <img src={sug.imagen_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
            : <div className="w-6 h-6 rounded bg-gray-100 shrink-0" />
          }
          <span className="text-xs text-gray-700 flex-1 truncate min-w-0">{sug.nombre}</span>
          <span className="text-xs text-gray-400 shrink-0">${(sug.unit_price || 0).toFixed(2)}</span>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => updateQty(si, -1)} className="w-5 h-5 rounded bg-gray-200 hover:bg-gray-300 text-xs font-bold flex items-center justify-center">−</button>
            <span className="text-xs font-bold w-5 text-center">{sug.qty}</span>
            <button onClick={() => updateQty(si, 1)} className="w-5 h-5 rounded bg-gray-200 hover:bg-gray-300 text-xs font-bold flex items-center justify-center">+</button>
          </div>
          <button onClick={() => remove(si)} className="text-gray-300 hover:text-red-400 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <div className="relative">
        {!showSearch ? (
          <button onClick={() => setShowSearch(true)} className="text-xs text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {suggestions.length === 0 ? 'Sugerir reemplazo' : 'Agregar otro'}
          </button>
        ) : (
          <div className="relative">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => { setShowSearch(false); setQuery('') }, 150)}
              placeholder="Buscar producto…"
              className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 bg-amber-50"
            />
            {filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-52 overflow-y-auto">
                {filtered.map(p => (
                  <button key={p.id} onMouseDown={() => addSuggestion(p)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0">
                    {p.imagen_url
                      ? <img src={p.imagen_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      : <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                    }
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 truncate">{p.nombre}</p>
                      <p className="text-xs text-gray-400">{p.categoria}{p.subcategoria ? ` · ${p.subcategoria}` : ''} · ${(p.precio_1 || 0).toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
