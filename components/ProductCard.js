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

export default function ProductCard({ product, cartQty, cartSizes, categoryQty, onAdd, onRemove, onSetQty }) {
  const [imgError, setImgError] = useState(false)
  const [editingQty, setEditingQty] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [showSizes, setShowSizes] = useState(false)

  const hasSizes = product.tallas?.length > 0
  const qty = cartQty || 0
  const totalSizedQty = hasSizes
    ? Object.values(cartSizes || {}).reduce((s, q) => s + q, 0)
    : 0
  const displayQty = hasSizes ? totalSizedQty : qty
  // Para precio: usa el total de la categoría si es mayor (mayoreo agrupado)
  const pricingQty = Math.max(displayQty || 1, categoryQty || 0)
  const currentPrice = getPrecio(product, pricingQty)
  const hasTiers = product.qty_tier2 || product.qty_tier3 || product.qty_tier4 || product.qty_tier5

  // Siguiente tier al que puede llegar el cliente
  const allTiers = [
    product.qty_tier2 && { qty: product.qty_tier2, price: product.precio_tier2 },
    product.qty_tier3 && { qty: product.qty_tier3, price: product.precio_tier3 },
    product.qty_tier4 && { qty: product.qty_tier4, price: product.precio_tier4 },
    product.qty_tier5 && { qty: product.qty_tier5, price: product.precio_tier5 },
  ].filter(Boolean)
  const nextTier = displayQty > 0 ? allTiers.find(t => pricingQty < t.qty) : null
  const isDiscounted = pricingQty >= (product.qty_tier2 || Infinity)
  const savingsPct = isDiscounted ? Math.round((1 - currentPrice / product.precio_1) * 100) : 0

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col">
      {/* Imagen */}
      <div className="relative aspect-square bg-gray-100">
        {product.imagen_url && !imgError ? (
          <img
            src={product.imagen_url}
            alt={product.nombre}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <ImagePlaceholder />
        )}
        {product.destacado && (
          <span className="absolute top-2 left-2 bg-black text-white text-xs px-2 py-0.5 rounded-full font-medium">
            Top
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{product.categoria}</p>
        {product.subcategoria && (
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-0.5">{product.subcategoria}</p>
        )}
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{product.nombre}</h3>

        {product.descripcion && (
          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{product.descripcion}</p>
        )}

        {/* Tabla de precios por volumen */}
        {hasTiers && (
          <div className="mb-2 rounded-lg bg-gray-50 p-2 space-y-0.5 text-xs">
            <TierRow
              label={`${product.qty_minima || 1}–${product.qty_tier2 ? product.qty_tier2 - 1 : '+'} u.`}
              price={product.precio_1}
              active={pricingQty === 0 || pricingQty < (product.qty_tier2 || Infinity)}
            />
            {product.qty_tier2 && product.precio_tier2 && (
              <TierRow
                label={`${product.qty_tier2}–${product.qty_tier3 ? product.qty_tier3 - 1 : '+'} u.`}
                price={product.precio_tier2}
                active={pricingQty >= product.qty_tier2 && (!product.qty_tier3 || pricingQty < product.qty_tier3)}
                highlight
              />
            )}
            {product.qty_tier3 && product.precio_tier3 && (
              <TierRow
                label={`${product.qty_tier3}–${product.qty_tier4 ? product.qty_tier4 - 1 : '+'} u.`}
                price={product.precio_tier3}
                active={pricingQty >= product.qty_tier3 && (!product.qty_tier4 || pricingQty < product.qty_tier4)}
                highlight
              />
            )}
            {product.qty_tier4 && product.precio_tier4 && (
              <TierRow
                label={`${product.qty_tier4}–${product.qty_tier5 ? product.qty_tier5 - 1 : '+'} u.`}
                price={product.precio_tier4}
                active={pricingQty >= product.qty_tier4 && (!product.qty_tier5 || pricingQty < product.qty_tier5)}
                highlight
              />
            )}
            {product.qty_tier5 && product.precio_tier5 && (
              <TierRow
                label={`${product.qty_tier5}+ u.`}
                price={product.precio_tier5}
                active={pricingQty >= product.qty_tier5}
                highlight
                best
              />
            )}
            {/* Indicador de mayoreo agrupado por categoría */}
            {categoryQty > (displayQty || 0) && (
              <p className="text-green-600 font-medium pt-0.5 border-t border-gray-200 mt-1">
                ✓ {categoryQty} u. en total en esta categoría
              </p>
            )}
          </div>
        )}

        {/* Precio actual */}
        <div className="flex items-center justify-between mt-auto pt-1 gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-base font-bold text-gray-900">${currentPrice.toFixed(2)}</span>
              <span className="text-xs text-gray-400">c/u</span>
              {isDiscounted && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
                  Descuento −{savingsPct}%
                </span>
              )}
            </div>
            {nextTier && (
              <p className="text-xs text-blue-600 font-medium mt-0.5">
                +{nextTier.qty - pricingQty} u. más → ${nextTier.price.toFixed(2)} c/u
              </p>
            )}
          </div>

          {/* Controles SIN tallas */}
          {!hasSizes && (
            qty > 0 ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onRemove(product.id)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-lg leading-none text-gray-700 shrink-0"
                >−</button>
                {editingQty ? (
                  <input
                    type="number"
                    min={1}
                    autoFocus
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onBlur={() => {
                      const n = parseInt(inputVal)
                      if (n >= 1) onSetQty(product.id, n)
                      setEditingQty(false)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.target.blur()
                      if (e.key === 'Escape') setEditingQty(false)
                    }}
                    className="w-9 h-9 text-center font-semibold text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  />
                ) : (
                  <span
                    onClick={() => { setInputVal(String(qty)); setEditingQty(true) }}
                    className="w-9 h-9 text-center font-semibold text-sm cursor-pointer hover:bg-gray-100 rounded-lg flex items-center justify-center"
                  >{qty}</span>
                )}
                <button
                  onClick={() => onAdd(product)}
                  className="w-9 h-9 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center font-bold text-lg leading-none text-white shrink-0"
                >+</button>
              </div>
            ) : (
              <button
                onClick={() => onAdd(product)}
                className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors"
              >Agregar</button>
            )
          )}

          {/* Controles CON tallas */}
          {hasSizes && (
            <button
              onClick={() => setShowSizes(v => !v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                totalSizedQty > 0
                  ? 'bg-black text-white'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {totalSizedQty > 0 ? `${totalSizedQty} u. ▾` : 'Agregar'}
            </button>
          )}
        </div>

        {/* Selector de tallas (inline) */}
        {hasSizes && showSizes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">Selecciona talla:</p>
            <div className="flex flex-wrap gap-2">
              {product.tallas.map(size => {
                const sizeQty = cartSizes?.[size] || 0
                const cartId = `${product.id}__${size}`
                return (
                  <div key={size} className="flex items-center gap-1">
                    {sizeQty > 0 ? (
                      <>
                        <button
                          onClick={() => onRemove(cartId)}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600"
                        >−</button>
                        <div className="flex flex-col items-center min-w-[28px]">
                          <span className="text-sm font-bold text-gray-900 leading-none">{sizeQty}</span>
                          <span className="text-xs text-gray-500 leading-none">{size}</span>
                        </div>
                        <button
                          onClick={() => onAdd(product, size)}
                          className="w-8 h-8 rounded-lg bg-black hover:bg-gray-800 flex items-center justify-center text-sm font-bold text-white"
                        >+</button>
                      </>
                    ) : (
                      <button
                        onClick={() => onAdd(product, size)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:border-black hover:text-black transition-colors"
                      >{size}</button>
                    )}
                  </div>
                )
              })}
            </div>
            {product.qty_minima > 1 && (
              <p className="text-xs text-gray-400 mt-2">Min. {product.qty_minima} unidades en total</p>
            )}
          </div>
        )}

        {!hasSizes && product.qty_minima > 1 && (
          <p className="text-xs text-gray-400 mt-1">Min. {product.qty_minima} unidades</p>
        )}
      </div>
    </div>
  )
}

function TierRow({ label, price, active, highlight, best }) {
  const activeColor = best
    ? 'text-amber-600 font-bold'
    : highlight
      ? 'text-green-600 font-semibold'
      : 'text-gray-800 font-semibold'
  return (
    <div className={`flex justify-between items-center ${active ? activeColor : 'text-gray-400'}`}>
      <span>{label}{best && active && <span className="ml-1 text-amber-500 font-bold">★</span>}</span>
      <span>${price.toFixed(2)}</span>
    </div>
  )
}
