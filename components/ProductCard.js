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
  // Muestra progreso de tier si hay qty de este producto O de la subcategoría/categoría
  const nextTier = displayQty > 0 ? allTiers.find(t => pricingQty < t.qty) : null
  const isDiscounted = pricingQty >= (product.qty_tier2 || Infinity)
  const savingsPct = isDiscounted ? Math.round((1 - currentPrice / product.precio_1) * 100) : 0

  // Stock para productos sin tallas (Alo Yoga unidad única)
  const stockTracked = product.stock !== null && product.stock !== undefined
  const isOut = stockTracked && product.stock === 0
  const isLow = stockTracked && product.stock > 0 && product.stock <= 5

  // Precio más bajo disponible (último tier configurado)
  const lowestTierPrice = allTiers.length > 0 ? allTiers[allTiers.length - 1].price : null

  return (
    <div className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow border border-[#E8E8E8] flex flex-col">
      {/* Imagen */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.imagen_url && !imgError ? (
          <img
            src={product.imagen_url}
            alt={product.nombre}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <ImagePlaceholder />
        )}
        {product.destacado && (
          <span className="absolute top-2 left-2 bg-[#FF6A00] text-white text-xs px-2 py-0.5 rounded-full font-medium">
            Top
          </span>
        )}
        {/* Stock badges — bottom right */}
        {stockTracked && product.stock > 0 && !isLow && (
          <span className="absolute bottom-2 right-2 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
            In Stock
          </span>
        )}
        {isOut && (
          <span className="absolute bottom-2 right-2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
            Out of Stock
          </span>
        )}
        {isLow && (
          <span className="absolute bottom-2 right-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
            Last {product.stock}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[10px] text-[#FF6A00] uppercase tracking-wide font-semibold mb-0.5">{product.categoria}</p>
        {product.subcategoria && (
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-0.5">{product.subcategoria}</p>
        )}
        <h3 className="font-semibold text-[#333] text-sm leading-snug mb-1">{product.nombre}</h3>

        {product.descripcion && (
          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{product.descripcion}</p>
        )}

        {/* Tabla de precios por volumen */}
        {hasTiers && (
          <div className="mb-2 rounded-lg bg-[#FFF7F0] p-2 space-y-0.5 text-xs">
            {(product.categoria === 'Lululemon' || product.categoria === 'Alo Yoga') && (
              <p className="text-gray-400 pb-1 border-b border-gray-200 mb-1">Price based on total pieces in subcategory</p>
            )}
            <TierRow
              label={`${(product.categoria === 'Lululemon' || product.categoria === 'Alo Yoga') ? 1 : (product.qty_minima || 1)}–${product.qty_tier2 ? product.qty_tier2 - 1 : '+'} pcs`}
              price={product.precio_1}
              active={pricingQty === 0 || pricingQty < (product.qty_tier2 || Infinity)}
            />
            {product.qty_tier2 && product.precio_tier2 && (
              <TierRow
                label={`${product.qty_tier2}–${product.qty_tier3 ? product.qty_tier3 - 1 : '+'} pcs`}
                price={product.precio_tier2}
                active={pricingQty >= product.qty_tier2 && (!product.qty_tier3 || pricingQty < product.qty_tier3)}
                highlight
              />
            )}
            {product.qty_tier3 && product.precio_tier3 && (
              <TierRow
                label={`${product.qty_tier3}–${product.qty_tier4 ? product.qty_tier4 - 1 : '+'} pcs`}
                price={product.precio_tier3}
                active={pricingQty >= product.qty_tier3 && (!product.qty_tier4 || pricingQty < product.qty_tier4)}
                highlight
              />
            )}
            {product.qty_tier4 && product.precio_tier4 && (
              <TierRow
                label={`${product.qty_tier4}–${product.qty_tier5 ? product.qty_tier5 - 1 : '+'} pcs`}
                price={product.precio_tier4}
                active={pricingQty >= product.qty_tier4 && (!product.qty_tier5 || pricingQty < product.qty_tier5)}
                highlight
              />
            )}
            {product.qty_tier5 && product.precio_tier5 && (
              <TierRow
                label={`${product.qty_tier5}+ pcs`}
                price={product.precio_tier5}
                active={pricingQty >= product.qty_tier5}
                highlight
                best
              />
            )}
            {categoryQty > (displayQty || 0) && (
              <p className="text-green-600 font-medium pt-0.5 border-t border-gray-200 mt-1">
                ✓ {categoryQty} pcs total in this {(product.categoria === 'Lululemon' || product.categoria === 'Alo Yoga') ? 'subcategory' : 'category'}
              </p>
            )}
            {/* Nota LV: el precio mejora con cualquier perfume del pedido */}
            {product.subcategoria === 'Louis Vuitton' && (
              <p className="text-xs text-purple-600 font-medium pt-0.5 border-t border-gray-200 mt-1">
                Price applies to total perfumes in your order (LV + all brands)
              </p>
            )}
          </div>
        )}

        {/* Precio actual */}
        <div className="mt-auto pt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-base font-bold text-[#FF6A00]">${currentPrice.toFixed(2)}</span>
                <span className="text-xs text-gray-400">ea.</span>
                {isDiscounted && (
                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                    −{savingsPct}%
                  </span>
                )}
              </div>
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
                        if (n >= 1) {
                          const clamped = stockTracked ? Math.min(n, product.stock) : n
                          onSetQty(product.id, clamped)
                        }
                        setEditingQty(false)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') e.target.blur()
                        if (e.key === 'Escape') setEditingQty(false)
                      }}
                      className="w-9 h-9 text-center font-semibold text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#FF6A00]"
                    />
                  ) : (
                    <span
                      onClick={() => { setInputVal(String(qty)); setEditingQty(true) }}
                      className="w-9 h-9 text-center font-semibold text-sm cursor-pointer hover:bg-gray-100 rounded-lg flex items-center justify-center"
                    >{qty}</span>
                  )}
                  <button
                    onClick={() => onAdd(product)}
                    disabled={stockTracked && qty >= product.stock}
                    className="w-9 h-9 rounded-full bg-[#FF6A00] hover:bg-[#E55A00] flex items-center justify-center font-bold text-lg leading-none text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >+</button>
                </div>
              ) : (
                <button
                  onClick={() => onAdd(product)}
                  disabled={isOut}
                  className="px-4 py-2 bg-[#FF6A00] text-white text-xs font-semibold rounded-xl hover:bg-[#E55A00] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >Add</button>
              )
            )}

            {/* Controles CON tallas */}
            {hasSizes && (
              <button
                onClick={() => setShowSizes(v => !v)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors shrink-0 ${
                  totalSizedQty > 0
                    ? 'bg-[#FF6A00] text-white'
                    : 'bg-[#FF6A00] text-white hover:bg-[#E55A00]'
                }`}
              >
                {totalSizedQty > 0 ? `${totalSizedQty} pcs ▾` : 'Add'}
              </button>
            )}
          </div>

          {nextTier && (
            <p className="text-xs text-[#FF6A00] font-medium mt-1.5 leading-snug">
              +{nextTier.qty - pricingQty} {product.subcategoria === 'Louis Vuitton' ? 'more pcs (any perfume)' : 'more pcs'} → ${nextTier.price.toFixed(2)} ea.
            </p>
          )}
        </div>

        {/* Selector de tallas (inline) */}
        {hasSizes && showSizes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">Select size:</p>
            <div className="flex flex-wrap gap-2">
              {product.tallas.map(size => {
                const sizeQty = cartSizes?.[size] || 0
                const cartId = `${product.id}__${size}`
                const avail = product.talla_stock?.[size]
                const tracked = avail !== undefined
                const isOut = tracked && avail === 0
                const isLow = tracked && avail > 0 && avail <= 5
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
                          disabled={tracked && sizeQty >= avail}
                          className="w-8 h-8 rounded-lg bg-[#FF6A00] hover:bg-[#E55A00] flex items-center justify-center text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >+</button>
                      </>
                    ) : (
                      <button
                        onClick={() => !isOut && onAdd(product, size)}
                        disabled={isOut}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          isOut
                            ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                            : 'border-gray-200 text-gray-600 hover:border-[#FF6A00] hover:text-[#FF6A00]'
                        }`}
                      >
                        <span>{size}</span>
                        {tracked && (
                          <span className={`block text-[10px] leading-none mt-0.5 ${isOut ? 'text-red-400' : isLow ? 'text-amber-500' : 'text-gray-400'}`}>
                            {isOut ? 'Out of Stock' : `${avail} avail.`}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {product.qty_minima > 1 && !(product.categoria === 'Lululemon' || product.categoria === 'Alo Yoga') && (
              <p className="text-xs text-gray-400 mt-2">Min. {product.qty_minima} pcs total in "{product.categoria}" category</p>
            )}
          </div>
        )}

        {(product.categoria === 'Lululemon' || product.categoria === 'Alo Yoga')
          ? <p className="text-xs text-gray-400 mt-1">Min. 10 pcs total for {product.categoria}</p>
          : !hasSizes && product.qty_minima > 1
            ? <p className="text-xs text-gray-400 mt-1">Min. {product.qty_minima} pcs total in "{product.categoria}" category</p>
            : null
        }

        {/* Trust footer */}
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5">
          <span className="text-[10px] text-green-600 font-semibold">&#10003; Verified</span>
          <span className="text-gray-300 text-[10px]">·</span>
          <span className="text-[10px] text-gray-400">USA Shipping</span>
        </div>
      </div>
    </div>
  )
}

function TierRow({ label, price, active, highlight, best }) {
  const activeColor = best
    ? 'text-[#FF6A00] font-bold'
    : highlight
      ? 'text-green-600 font-semibold'
      : 'text-gray-800 font-semibold'
  return (
    <div className={`flex justify-between items-center ${active ? activeColor : 'text-gray-400'}`}>
      <span>{active && <span className="mr-1">●</span>}{label}{best && active && <span className="ml-1 text-[#FF6A00] font-bold">★</span>}</span>
      <span>${price.toFixed(2)}</span>
    </div>
  )
}
