'use client'
import { useState } from 'react'
import { getPrecio } from '@/lib/pricing'
import { DEFAULT_SHIPPING } from '@/lib/constants'

// Lululemon: City Bags (sub='Bags') pool independiente, min 10 pcs. Resto de Lululemon mezcla junto, min 10 pcs.
// Alo Yoga: todo mezcla en un solo pool, min 10 pcs. Resto agrupa por categoría.
const AloYoga = 'Alo Yoga'
const LULULEMON = 'Lululemon'
const CITY_BAGS_SUB = 'Bags'

function getPricingKey(cat, sub) {
  if (cat === LULULEMON) return sub === CITY_BAGS_SUB ? 'Lululemon__Bags' : 'Lululemon'
  return cat
}

export default function Cart({ items, products, onAdd, onRemove, onClose, onRequestQuote, onClearAll }) {
  const [confirmClear, setConfirmClear] = useState(false)

  // Qty total por categoría (para display)
  const totalByCategory = items.reduce((acc, item) => {
    const cat = item.categoria || products.find(p => p.id === item.productId)?.categoria || ''
    acc[cat] = (acc[cat] || 0) + item.qty
    return acc
  }, {})

  // Qty por pool de pricing
  const totalByPricingGroup = items.reduce((acc, item) => {
    const product = products.find(p => p.id === item.productId)
    const cat = item.categoria || product?.categoria || ''
    const sub = product?.subcategoria || ''
    const key = getPricingKey(cat, sub)
    acc[key] = (acc[key] || 0) + item.qty
    return acc
  }, {})

  const cartLines = items
    .map(item => {
      const product = products.find(p => p.id === item.productId)
      if (!product) return null
      const cat = item.categoria || product.categoria
      const sub = product.subcategoria || ''
      const pricingKey = getPricingKey(cat, sub)
      const pricingQty = totalByPricingGroup[pricingKey] || item.qty
      const price = getPrecio(product, pricingQty)
      const subtotal = price * item.qty
      return { ...item, product, price, subtotal, pricingQty }
    })
    .filter(Boolean)

  const total = cartLines.reduce((sum, l) => sum + l.subtotal, 0)
  const isEmpty = cartLines.length === 0

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
      if (cat === LULULEMON) {
        // Pool 1: City Bags — completamente independiente
        const bagsQty = totalByPricingGroup['Lululemon__Bags'] || 0
        if (bagsQty > 0) {
          const bagsRep = cartLines.find(l => l.product.categoria === LULULEMON && l.product.subcategoria === CITY_BAGS_SUB)?.product
          if (bagsRep) {
            const tiers = buildTiers(bagsRep)
            if (bagsQty < 10) {
              result.push({ cat: 'City Bags', qty: bagsQty, minQty: 10, isIncomplete: true })
            } else {
              result.push({ cat: 'City Bags', qty: bagsQty, minQty: null, isIncomplete: false, nextTier: tiers.find(t => bagsQty < t.qty), hasTiers: tiers.length > 0, currentPrice: getPrecio(bagsRep, bagsQty) })
            }
          }
        }
        // Pool 2: resto de Lululemon — todo mezcla junto
        const nonBagsQty = totalByPricingGroup['Lululemon'] || 0
        if (nonBagsQty > 0) {
          const nonBagsRep = cartLines.find(l => l.product.categoria === LULULEMON && l.product.subcategoria !== CITY_BAGS_SUB)?.product
          if (nonBagsRep) {
            const tiers = buildTiers(nonBagsRep)
            if (nonBagsQty < 10) {
              result.push({ cat: 'Lululemon', qty: nonBagsQty, minQty: 10, isIncomplete: true })
            } else {
              result.push({ cat: 'Lululemon', qty: nonBagsQty, minQty: null, isIncomplete: false, nextTier: tiers.find(t => nonBagsQty < t.qty), hasTiers: tiers.length > 0, currentPrice: getPrecio(nonBagsRep, nonBagsQty) })
            }
          }
        }
        return
      }

      if (cat === AloYoga) {
        const aloQty = totalByPricingGroup[AloYoga] || 0
        const aloRep = cartLines.find(l => l.product.categoria === AloYoga)?.product
        if (!aloRep) return
        const tiers = buildTiers(aloRep)
        if (aloQty < 10) {
          result.push({ cat: AloYoga, qty: aloQty, minQty: 10, isIncomplete: true })
        } else {
          result.push({ cat: AloYoga, qty: aloQty, minQty: null, isIncomplete: false, nextTier: tiers.find(t => aloQty < t.qty), hasTiers: tiers.length > 0, currentPrice: getPrecio(aloRep, aloQty) })
        }
        return
      }

      // Resto de categorías
      const rep = cat === 'Perfumes'
        ? (cartLines.find(l => l.product.categoria === cat && l.product.subcategoria !== 'Louis Vuitton')?.product
            || cartLines.find(l => l.product.categoria === cat)?.product)
        : cartLines.find(l => l.product.categoria === cat)?.product
      if (!rep) return
      const minQty = rep.qty_minima || 1
      const isIncomplete = minQty > 1 && catQty < minQty
      const tiers = buildTiers(rep)
      const currentPrice = getPrecio(rep, catQty)
      result.push({ cat, qty: catQty, minQty, isIncomplete, nextTier: tiers.find(t => catQty < t.qty), hasTiers: tiers.length > 0, currentPrice })
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
            Your Order{!isEmpty && <span className="ml-2 text-gray-400 font-normal text-sm">{cartLines.length} item{cartLines.length !== 1 ? 's' : ''}</span>}
          </h2>
          <div className="flex items-center gap-3">
            {!isEmpty && !confirmClear && (
              <button onClick={() => setConfirmClear(true)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Clear
              </button>
            )}
            {!isEmpty && confirmClear && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Remove all?</span>
                <button
                  onClick={() => { onClearAll(); setConfirmClear(false) }}
                  className="text-xs font-semibold text-red-500 hover:text-red-700"
                >Yes</button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >No</button>
              </div>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" aria-label="Close">
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
              <p className="text-sm">Add products to your order</p>
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
                      ${line.price.toFixed(2)} ea.
                      {(line.price < line.product.precio_1 ||
                        (line.product.qty_tier2 && line.pricingQty >= line.product.qty_tier2)) && (
                        <span className="ml-1 text-green-600 font-medium">bulk price</span>
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
              {categoriasIncompletas.map(({ cat, qty, minQty }) => (
                <div key={cat} className="rounded-xl px-3 py-2 text-xs bg-amber-50 border border-amber-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-amber-700">{cat}</span>
                    <span className="font-bold text-amber-600">{qty} pcs</span>
                  </div>
                  <p className="text-amber-600 mt-0.5">
                    Min. {minQty} pcs — need {minQty - qty} more
                  </p>
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
                <span>Est. Shipping</span>
                <span>${DEFAULT_SHIPPING.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                <span className="text-gray-600 text-sm font-semibold">Est. Total</span>
                <span className="text-2xl font-bold">${(total + DEFAULT_SHIPPING).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={onRequestQuote}
              disabled={categoriasIncompletas.length > 0}
              className="w-full py-3.5 bg-black hover:bg-gray-800 active:bg-gray-900 text-white font-bold rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Request Quote
            </button>
            <p className="text-xs text-gray-400 text-center">
              We'll confirm availability before charging
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

