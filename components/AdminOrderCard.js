'use client'
import { useState, useEffect } from 'react'
import { generarConfirmacionPDF } from '@/lib/pdf'
import { getCosto } from '@/lib/pricing'

const WHATSAPP = '16613737977'

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  paid: 'Pagado',
  shipped: 'Enviado',
  completed: 'Completado',
}

export default function AdminOrderCard({ order: initialOrder, adminPassword, onDelete }) {
  const [order, setOrder] = useState(initialOrder)
  const [saving, setSaving] = useState(false)
  const [partialQtys, setPartialQtys] = useState({})
  const [shipping, setShipping] = useState('')
  const [trackingInput, setTrackingInput] = useState(order.tracking_number || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState(false)
  const [pdfSelected, setPdfSelected] = useState(null) // null = todos, Set = selección explícita
  const [expanded, setExpanded] = useState(order.status === 'pending')
  const [costInputs, setCostInputs] = useState(() => {
    const byIdx = {}
    order.items.forEach((item, i) => { byIdx[i] = item.unit_cost ?? '' })
    return byIdx
  })
  const [costFromRules, setCostFromRules] = useState(new Set())
  const [savingCosts, setSavingCosts] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    const pwd = sessionStorage.getItem('adminPassword')
    fetch('/api/admin/costs', { headers: { 'x-admin-password': pwd } })
      .then(r => r.ok ? r.json() : [])
      .then(rules => {
        if (!Array.isArray(rules) || rules.length === 0) return
        const ruleIndices = new Set()
        setCostInputs(prev => {
          const updated = { ...prev }
          order.items.forEach((item, i) => {
            if (updated[i] !== '' && updated[i] !== null && updated[i] !== undefined) return
            const totalCategoryQty = order.items
              .filter(it => it.categoria === item.categoria)
              .reduce((s, it) => s + it.qty, 0)
            const costo = getCosto(rules, item, totalCategoryQty)
            if (costo !== null) {
              updated[i] = String(costo)
              ruleIndices.add(i)
            }
          })
          return updated
        })
        setCostFromRules(ruleIndices)
      })
  }, [])
  const [showHistory, setShowHistory] = useState(false)
  const [editingItems, setEditingItems] = useState(false)
  const [editItems, setEditItems] = useState(order.items)
  const [paymentLink, setPaymentLink] = useState('')
  const [replacements, setReplacements] = useState({}) // { itemIndex: 'texto del reemplazo' }

  const allReviewed = order.items.every(i => i.confirmed !== null)
  const confirmedItems = order.items.filter(i => i.confirmed !== false)

  // Inicializar selección cuando se confirman todos los items
  const initPdfSelection = () => {
    if (pdfSelected.size === 0) {
      setPdfSelected(new Set(confirmedItems.map((_, i) => order.items.indexOf(confirmedItems[i]))))
    }
  }

  function togglePdfItem(idx) {
    setPdfSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }
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
      if (res.ok) {
        setOrder(data)
        if (updates.status && updates.status !== 'pending') setExpanded(false)
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

  async function handleGenerarPDF() {
    setGeneratingPDF(true)
    try {
      const itemsParaPDF = pdfSelected === null
        ? confirmedItems
        : order.items.filter((_, i) => pdfSelected.has(i))
      const doc = await generarConfirmacionPDF(order, shippingCost, itemsParaPDF)
      doc.save(`confirmacion-${order.id.substring(0, 8).toUpperCase()}.pdf`)
    } catch (err) {
      alert('Error al generar el PDF: ' + err.message)
    } finally {
      setGeneratingPDF(false)
    }
  }

  async function handleEnviarWhatsApp() {
    const unavailable = order.items.filter(i => i.confirmed === false)
    const hayReemplazos = unavailable.some((_, idx) => replacements[order.items.indexOf(unavailable[idx])]?.trim())

    let msg = `Hola *${order.customer_name}*! Confirmamos disponibilidad de tu pedido:\n\n`
    confirmedItems.forEach(item => {
      const qty = item.available_qty || item.qty
      msg += `✓ ${qty}× ${item.nombre} — $${(qty * item.unit_price).toFixed(2)}\n`
    })
    if (unavailable.length > 0) {
      msg += `\nNo disponible:\n`
      unavailable.forEach(item => {
        const idx = order.items.indexOf(item)
        const rep = replacements[idx]?.trim()
        if (rep) {
          msg += `✗ ${item.nombre} — No disponible\n   ↳ ¿Lo reemplazamos con *${rep}*?\n`
        } else {
          msg += `✗ ${item.nombre} — No disponible\n`
        }
      })
    }
    if (shippingCost > 0) msg += `\nEnvío: $${shippingCost.toFixed(2)}`
    msg += `\n*Total: $${confirmedTotal.toFixed(2)}*`
    if (hayReemplazos) {
      msg += `\n\nIndícanos qué prefieres para actualizar tu pedido.`
    } else if (paymentLink.trim()) {
      msg += `\n\n💳 *Enlace de pago:*\n${paymentLink.trim()}`
    } else {
      msg += `\n\nPara proceder, favor de realizar el pago.`
    }
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
      const qty = item.available_qty || item.qty
      const sku = item.sku ? `[${item.sku}] ` : ''
      msg += `• ${sku}${item.nombre} — ${qty} u.\n`
    })
    msg += `\nTotal unidades: ${items.reduce((s, i) => s + (i.available_qty || i.qty), 0)}`
    navigator.clipboard?.writeText(msg)
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function handleOrdenProveedor() {
    const itemsParaExportar = pdfSelected === null
      ? confirmedItems
      : order.items.filter((_, i) => pdfSelected.has(i))
    exportarOrden(itemsParaExportar)
  }

  function handleOrdenLucy() {
    const items = confirmedItems.filter(i => i.sku?.toUpperCase().startsWith('XP'))
    exportarOrden(items, 'Lucy')
  }

  function handleOrdenJoy() {
    const items = confirmedItems.filter(i => i.sku?.toUpperCase().startsWith('S'))
    exportarOrden(items, 'Joy')
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
          <p className="text-xs text-gray-400 mt-0.5">{fecha} · #{order.id.substring(0, 8).toUpperCase()}</p>
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
        {order.items.map((item, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {order.status === 'pending' && item.confirmed !== false && (
                  <input
                    type="checkbox"
                    checked={pdfSelected === null ? true : pdfSelected.has(i)}
                    onChange={() => {
                      if (pdfSelected === null) {
                        const todos = new Set(
                          order.items.map((it, idx) => it.confirmed !== false ? idx : null).filter(x => x !== null)
                        )
                        todos.delete(i)
                        setPdfSelected(todos)
                      } else {
                        togglePdfItem(i)
                      }
                    }}
                    className="mt-0.5 w-4 h-4 accent-black shrink-0 cursor-pointer"
                  />
                )}
                <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                <p className="text-xs text-gray-400">{item.categoria} · {item.qty} u. · ${item.unit_price.toFixed(2)} c/u</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-700 shrink-0 ml-2">
                ${(item.qty * item.unit_price).toFixed(2)}
              </p>
            </div>

            {/* Costo por producto */}
            {(() => {
              const qty = item.available_qty || item.qty
              const revenue = qty * item.unit_price
              const costo = parseFloat(costInputs[i])
              const ganancia = !isNaN(costo) ? revenue - costo * qty : null
              return (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-gray-400">Costo $</span>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costInputs[i] ?? ''}
                      onChange={e => {
                        setCostInputs(prev => ({ ...prev, [i]: e.target.value }))
                        setCostFromRules(prev => { const n = new Set(prev); n.delete(i); return n })
                      }}
                      placeholder="0.00"
                      className={`w-20 px-2 py-1 rounded-lg text-xs text-center focus:outline-none transition-colors ${
                        costFromRules.has(i)
                          ? 'border border-blue-300 bg-blue-50 text-blue-700 focus:border-blue-500'
                          : 'border border-gray-200 focus:border-gray-400'
                      }`}
                    />
                    {costFromRules.has(i) && (
                      <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-blue-500 text-white rounded-full px-1 leading-tight">R</span>
                    )}
                  </div>
                  {ganancia !== null && (
                    <span className={`text-xs font-semibold ${ganancia >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {ganancia >= 0 ? '+' : ''}${ganancia.toFixed(2)}
                    </span>
                  )}
                </div>
              )
            })()}

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

            {/* Reemplazo sugerido — visible cuando el item está marcado como no disponible */}
            {order.status === 'pending' && item.confirmed === false && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-amber-600 shrink-0">↳ Ofrecer reemplazo:</span>
                <input
                  type="text"
                  value={replacements[i] || ''}
                  onChange={e => setReplacements(prev => ({ ...prev, [i]: e.target.value }))}
                  placeholder="Ej: Versace Eros 100ml"
                  className="flex-1 px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 bg-amber-50"
                />
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

        {/* Guardar costos por producto */}
        <button
          onClick={handleSaveCosts}
          disabled={savingCosts}
          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
        >
          {savingCosts ? 'Guardando…' : 'Guardar costos'}
        </button>

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
            <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
              <span>Total{allReviewed ? ' confirmado' : ' estimado'}</span>
              <span>${confirmedTotal.toFixed(2)}</span>
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

        {/* Selección por categoría para PDF */}
        {order.status === 'pending' && (() => {
          const cats = [...new Set(confirmedItems.map(i => i.categoria))]
          if (cats.length < 2) return null
          return (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-400 font-medium">Seleccionar por categoría:</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setPdfSelected(null)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    pdfSelected === null ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >Todos</button>
                <button
                  onClick={() => setPdfSelected(new Set())}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    pdfSelected !== null && pdfSelected.size === 0 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >Ninguno</button>
                {cats.map(cat => {
                  const idxs = order.items
                    .map((item, i) => item.categoria === cat && item.confirmed !== false ? i : null)
                    .filter(x => x !== null)
                  const isActive = pdfSelected !== null && idxs.length > 0 && idxs.every(i => pdfSelected.has(i))
                  return (
                    <button
                      key={cat}
                      onClick={() => setPdfSelected(new Set(idxs))}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        isActive ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >{cat}</button>
                  )
                })}
              </div>
            </div>
          )
        })()}

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
              <button
                onClick={handleGenerarPDF}
                disabled={generatingPDF}
                className="flex-1 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-60 transition-colors"
              >
                {generatingPDF ? 'Generando…' : `PDF para cliente ${pdfSelected === null ? '' : pdfSelected.size === 0 ? '(ninguno)' : `(${pdfSelected.size})`}`}
              </button>
              <div className="w-full space-y-1.5">
                <input
                  type="url"
                  value={paymentLink}
                  onChange={e => setPaymentLink(e.target.value)}
                  placeholder="Enlace de pago (opcional, se incluye en el mensaje)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-gray-400"
                />
                <button
                  onClick={handleEnviarWhatsApp}
                  className="w-full py-2 bg-green-500 text-white text-xs font-semibold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Avisar cliente{paymentLink.trim() ? ' + enlace de pago' : ''}
                </button>
              </div>
              <button
                onClick={() => patch({ status: 'confirmed' })}
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
                onClick={() => { patch({ items: editItems }); setEditingItems(false) }}
                disabled={saving || editItems.length === 0}
                className="w-full py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors mt-1"
              >Guardar cambios</button>
            </div>
          )}
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
