'use client'
import { useState } from 'react'
import { getPrecio } from '@/lib/pricing'

function ImagePlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center text-gray-200">
      <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
      </svg>
    </div>
  )
}

export default function GroupedProductCard({ group, cart, onAdd, onRemove, categoryQty }) {
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const base = group.variants[0]

  const totalInCart = group.variants.reduce((sum, v) => {
    const item = cart.find(i => i.id === `${v.id}__${v.talla}`)
    return sum + (item?.qty || 0)
  }, 0)

  const availableCount = group.variants.filter(v => v.stock === null || v.stock > 0).length
  const pricingQty = Math.max(totalInCart || 1, categoryQty || 0)
  const currentPrice = getPrecio(base, pricingQty)

  const hasTiers = base.qty_tier2 || base.qty_tier3 || base.qty_tier4
  const allTiers = [
    base.qty_tier2 && base.precio_tier2 ? { qty: base.qty_tier2, price: base.precio_tier2 } : null,
    base.qty_tier3 && base.precio_tier3 ? { qty: base.qty_tier3, price: base.precio_tier3 } : null,
    base.qty_tier4 && base.precio_tier4 ? { qty: base.qty_tier4, price: base.precio_tier4 } : null,
  ].filter(Boolean)
  const nextTier = allTiers.find(t => pricingQty < t.qty)
  const isDiscounted = pricingQty >= (base.qty_tier2 || Infinity)
  const savingsPct = isDiscounted ? Math.round((1 - currentPrice / base.precio_1) * 100) : 0

  return (
    <>
      {/* Folder card */}
      <div
        onClick={() => setOpen(true)}
        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col cursor-pointer active:scale-[0.98] transition-transform"
      >
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {base.imagen_url && !imgError ? (
            <img
              src={base.imagen_url}
              alt={group.nombre}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <ImagePlaceholder />
          )}
          {base.destacado && (
            <span className="absolute top-2 left-2 bg-black text-white text-xs px-2 py-0.5 rounded-full font-medium">Top</span>
          )}
          {totalInCart > 0 && (
            <span className="absolute top-2 right-2 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {totalInCart}
            </span>
          )}
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            {group.variants.length} tallas
          </div>
        </div>

        <div className="p-3 flex flex-col flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{group.categoria}</p>
          {group.subcategoria && (
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-0.5">{group.subcategoria}</p>
          )}
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{group.nombre}</h3>

          {/* Tabla de tiers — igual que ProductCard */}
          {hasTiers && (
            <div className="mb-2 rounded-lg bg-gray-50 p-2 space-y-0.5 text-xs">
              {(group.categoria === 'Lululemon' || group.categoria === 'Alo Yoga') && (
                <p className="text-gray-400 pb-1 border-b border-gray-200 mb-1">Precio según total de piezas en la categoría</p>
              )}
              <TierRow label={`${base.qty_minima || 1}–${base.qty_tier2 ? base.qty_tier2 - 1 : '+'} u.`} price={base.precio_1} active={pricingQty < (base.qty_tier2 || Infinity)} />
              {base.qty_tier2 && base.precio_tier2 && <TierRow label={`${base.qty_tier2}–${base.qty_tier3 ? base.qty_tier3 - 1 : '+'} u.`} price={base.precio_tier2} active={pricingQty >= base.qty_tier2 && (!base.qty_tier3 || pricingQty < base.qty_tier3)} highlight />}
              {base.qty_tier3 && base.precio_tier3 && <TierRow label={`${base.qty_tier3}–${base.qty_tier4 ? base.qty_tier4 - 1 : '+'} u.`} price={base.precio_tier3} active={pricingQty >= base.qty_tier3 && (!base.qty_tier4 || pricingQty < base.qty_tier4)} highlight />}
              {base.qty_tier4 && base.precio_tier4 && <TierRow label={`${base.qty_tier4}+ u.`} price={base.precio_tier4} active={pricingQty >= base.qty_tier4} highlight best />}
              {categoryQty > totalInCart && (
                <p className="text-green-600 font-medium pt-0.5 border-t border-gray-200 mt-1">✓ {categoryQty} u. en total en esta categoría</p>
              )}
              {base.qty_minima > 1 && (
                <p className="text-gray-400 pt-0.5 border-t border-gray-200 mt-1">Mín. {base.qty_minima} pz en total en la categoría</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-auto">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-base font-bold text-gray-900">${currentPrice.toFixed(2)}</span>
                <span className="text-xs text-gray-400">c/u</span>
                {isDiscounted && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">−{savingsPct}%</span>}
              </div>
              {nextTier && (
                <p className="text-xs text-blue-600 font-medium mt-0.5">+{nextTier.qty - pricingQty} u. más → ${nextTier.price.toFixed(2)} c/u</p>
              )}
            </div>
          </div>
          {(group.categoria === 'Lululemon' || group.categoria === 'Alo Yoga') && (
            <p className="text-xs text-gray-400 mt-1">Mín. 10 pz totales de {group.categoria}</p>
          )}
        </div>
      </div>

      {/* Modal de tallas */}
      {open && (
        <SizeModal
          group={group}
          cart={cart}
          onAdd={onAdd}
          onRemove={onRemove}
          onClose={() => setOpen(false)}
          currentPrice={currentPrice}
          totalInCart={totalInCart}
          categoryQty={categoryQty}
          nextTier={nextTier}
          minQty={base.qty_minima || 1}
        />
      )}
    </>
  )
}

function SizeModal({ group, cart, onAdd, onRemove, onClose, currentPrice, totalInCart, categoryQty, nextTier, minQty }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{group.categoria} · {group.subcategoria}</p>
            <h2 className="font-bold text-gray-900 text-base leading-snug mt-0.5">{group.nombre}</h2>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">${currentPrice.toFixed(2)} <span className="font-normal text-gray-400">c/u</span></p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lista de tallas */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {group.variants.map(variant => {
            const cartId = `${variant.id}__${variant.talla}`
            const cartItem = cart.find(i => i.id === cartId)
            const inCart = cartItem?.qty || 0
            const isOutOfStock = variant.stock !== null && variant.stock === 0
            const stockLabel = variant.stock !== null ? `${variant.stock} disponibles` : 'Disponible'

            return (
              <div
                key={variant.id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
                  isOutOfStock
                    ? 'border-gray-100 bg-gray-50'
                    : inCart > 0
                      ? 'border-black bg-black/5'
                      : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-10 ${isOutOfStock ? 'text-gray-300' : 'text-gray-900'}`}>
                    {variant.talla}
                  </span>
                  {isOutOfStock && (
                    <span className="text-xs text-gray-300">Agotado</span>
                  )}
                </div>

                {isOutOfStock ? (
                  <span className="text-xs text-gray-300 px-3">—</span>
                ) : inCart > 0 ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRemove(cartId)}
                      className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-700"
                    >−</button>
                    <span className="text-sm font-bold text-gray-900 w-5 text-center">{inCart}</span>
                    <button
                      onClick={() => onAdd(variant, variant.talla)}
                      disabled={variant.stock !== null && inCart >= variant.stock}
                      className="w-7 h-7 rounded-lg bg-black hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center text-sm font-bold text-white"
                    >+</button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAdd(variant, variant.talla)}
                    className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    Agregar
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer con resumen de cantidad y tiers */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-3xl sm:rounded-b-2xl space-y-1">
          {totalInCart > 0 ? (
            <p className="text-sm text-center text-gray-600">
              <span className="font-bold text-gray-900">{totalInCart}</span> u. de este modelo
              {categoryQty > totalInCart && (
                <span className="text-green-600 font-semibold"> · {categoryQty} en total en la categoría</span>
              )}
            </p>
          ) : minQty > 1 ? (
            <p className="text-xs text-center text-gray-400">Mín. {minQty} pz en total en la categoría</p>
          ) : null}
          {nextTier && (
            <p className="text-xs text-center text-blue-600 font-medium">
              +{nextTier.qty - Math.max(totalInCart, categoryQty || 0)} pz más → ${nextTier.price.toFixed(2)} c/u
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function TierRow({ label, price, active, highlight, best }) {
  const activeColor = best ? 'text-amber-600 font-bold' : highlight ? 'text-green-600 font-semibold' : 'text-gray-800 font-semibold'
  return (
    <div className={`flex justify-between items-center ${active ? activeColor : 'text-gray-400'}`}>
      <span>{label}{best && active && <span className="ml-1 text-amber-500 font-bold">★</span>}</span>
      <span>${price.toFixed(2)}</span>
    </div>
  )
}
