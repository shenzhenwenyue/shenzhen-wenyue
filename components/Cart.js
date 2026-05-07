'use client'
import { useState } from 'react'
import { getPrecio, getSubtotal } from '@/lib/pricing'
import { DEFAULT_SHIPPING } from '@/lib/constants'

// Estas categorías usan precios por subcategoría, no por categoría total
const SUBCATEGORIA_PRICING = new Set(['Lululemon', 'Alo Yoga'])

export default function Cart({ items, products, onAdd, onRemove, onClose, onRequestQuote, onClearAll }) {
  const [confirmClear, setConfirmClear] = useState(false)
  // Qty total por categoría — para el mínimo de piezas y resumen de footer
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

  const cartLines = items
    .map(item => {
      const product = products.find(p => p.id === item.productId)
      if (!product) return null
      const cat = item.categoria || product.categoria
      const sub = product.subcategoria || ''
      const pricingKey = SUBCATEGORIA_PRICING.has(cat) && sub ? `${cat}__${sub}` : cat
      const pricingQty = totalByPricingGroup[pricingKey] || item.qty
      const price = getPrecio(product, pricingQty)
      const subtotal = price * item.qty
      return { ...item, product, price, subtotal, pricingQty }
    })
    .filter(Boolean)

  const total = cartLines.reduce((sum, l) => sum + l.subtotal, 0)
  const isEmpty = cartLines.length === 0

  // Resumen para el footer del carrito
  function buildTiers(rep) {
    return [
      rep.qty_tier2 && rep.precio_tier2 ? { qty: rep.qty_tier2, price: rep.precio_tier2 } : null,
      rep.qty_tier3 && rep.precio_tier3 ? { qty: rep.qty_tier3, price: rep.precio_tier3 } : null,
      rep.qty_tier4 && rep.precio_tier4 ? { qty: rep.qty_tier4, price: rep.precio_tier4 } : null,
    ].filter(Boolean)
  }

  const categorySummary = (() => {
    const result = []
    Object.entries(totalByCategory).forEach(([cat, catQty]) => {
      if (SUBCATEGORIA_PRICING.has(cat)) {
        const rep = cartLines.find(l => l.product.categoria === cat)?.product
        if (!rep) return
        const minQty = 10  // mínimo de categoría fijo para marcas con pricing por subcategoría
        const isIncomplete = catQty < minQty
        if (isIncomplete) {
          // Mínimo no cubierto → advertencia a nivel categoría
          result.push({ cat, qty: catQty, minQty, isIncomplete: true, nextTier: null, hasTiers: false })
          return
        }
        // Mínimo cubierto → progreso por subcategoría
        const subcats = [...new Set(
          cartLines.filter(l => l.product.categoria === cat && l.product.subcategoria).map(l => l.product.subcategoria)
        )]
        subcats.forEach(sub => {
          const subQty = totalByPricingGroup[`${cat}__${sub}`] || 0
          const subRep = cartLines.find(l => l.product.categoria === cat && l.product.subcategoria === sub)?.product
          if (!subRep) return
          const tiers = buildTiers(subRep)
          result.push({ cat: sub, qty: subQty, minQty: null, isIncomplete: false, nextTier: tiers.find(t => subQty < t.qty), hasTiers: tiers.length > 0 })
        })
      } else {
        const rep = cat === 'Perfumes'
          ? (cartLines.find(l => l.product.categoria === cat && l.product.subcategoria !== 'Louis Vuitton')?.product
              || cartLines.find(l => l.product.categoria === cat)?.product)
          : cartLines.find(l => l.product.categoria === cat)?.product
        if (!rep) return
        const minQty = rep.qty_minima || 10
        const isIncomplete = catQty < minQty
        const tiers = buildTiers(rep)
        result.push({ cat, qty: catQty, minQty, isIncomplete, nextTier: tiers.find(t => catQty < t.qty), hasTiers: tiers.length > 0 })
      }
    })
    return result
  })()

  const categoriasIncompletas = categorySummary.filter(s => s.isIncomplete)


  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-bold">
            Tu Pedido{!isEmpty && <span className="ml-2 text-gray-400 font-normal text-sm">{cartLines.length} producto{cartLines.length !== 1 ? 's' : ''}</span>}
          </h2>
          <div className="flex items-center gap-3">
            {!isEmpty && !confirmClear && (
              <button onClick={() => setConfirmClear(true)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Vaciar
              </button>
            )}
            {!isEmpty && confirmClear && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">¿Eliminar todo?</span>
                <button
                  onClick={() => { onClearAll(); setConfirmClear(false) }}
                  className="text-xs font-semibold text-red-500 hover:text-red-700"
                >Sí</button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >No</button>
              </div>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" aria-label="Cerrar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm">Agrega productos al pedido</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {cartLines.map(line => (
                <div key={line.id} className="flex gap-3">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {line.product.imagen_url ? (
                      <img
                        src={line.product.imagen_url}
                        alt={line.product.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{line.product.categoria}</p>
                    <p className="text-sm font-medium text-gray-900 leading-snug">
                      {line.product.nombre}
                      {line.size && <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{line.size}</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ${line.price.toFixed(2)} c/u
                      {(line.price < line.product.precio_1 ||
                        (line.product.qty_tier2 && line.pricingQty >= line.product.qty_tier2)) && (
                        <span className="ml-1 text-green-600 font-medium">precio mayoreo</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-sm font-bold text-gray-900">${line.subtotal.toFixed(2)}</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onRemove(line.id)}
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-xs font-semibold">{line.qty}</span>
                      <button
                        onClick={() => onAdd(line.product, line.size || null)}
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEmpty && (
          <div className="border-t p-4 space-y-3">
            {/* Resumen por categoría */}
            <div className="space-y-1.5">
              {categorySummary.map(({ cat, qty, minQty, isIncomplete, nextTier, hasTiers }) => (
                <div key={cat} className={`rounded-xl px-3 py-2 text-xs ${isIncomplete ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${isIncomplete ? 'text-amber-700' : 'text-gray-700'}`}>{cat}</span>
                    <span className={`font-bold ${isIncomplete ? 'text-amber-600' : 'text-gray-900'}`}>{qty} pz</span>
                  </div>
                  {isIncomplete ? (
                    <p className="text-amber-600 mt-0.5">
                      Mín. {minQty} pz — agrega {minQty - qty} pieza{minQty - qty !== 1 ? 's' : ''} más
                    </p>
                  ) : nextTier ? (
                    <p className="text-blue-600 mt-0.5">
                      +{nextTier.qty - qty} pz más → ${nextTier.price.toFixed(2)} c/u
                    </p>
                  ) : hasTiers ? (
                    <p className="text-green-600 mt-0.5">Mejor precio activo ✓</p>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Envío estimado</span>
                <span>${DEFAULT_SHIPPING.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                <span className="text-gray-600 text-sm font-semibold">Total estimado</span>
                <span className="text-2xl font-bold">${(total + DEFAULT_SHIPPING).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={onRequestQuote}
              disabled={categoriasIncompletas.length > 0}
              className="w-full py-3.5 bg-black hover:bg-gray-800 active:bg-gray-900 text-white font-bold rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Solicitar Cotización
            </button>
            <p className="text-xs text-gray-400 text-center">
              Confirmaremos disponibilidad antes de cobrar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
