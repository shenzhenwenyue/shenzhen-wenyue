'use client'
import { useState } from 'react'

function ImagePlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center text-gray-200">
      <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
      </svg>
    </div>
  )
}

/**
 * Tarjeta de producto para dropshipping — SIN precios.
 * Maneja 3 casos: producto simple, con tallas, y agrupado (isGroup con variants).
 */
export default function DropshipCard({ product, cart, onAdd, onRemove, onSetQty }) {
  const [imgError, setImgError] = useState(false)
  const [showSizes, setShowSizes] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingQty, setEditingQty] = useState(false)
  const [inputVal, setInputVal] = useState('')

  // ── Caso agrupado (Lululemon con variantes de talla) ──────────
  if (product.isGroup) {
    const base = product.variants[0]
    const totalInCart = product.variants.reduce((sum, v) => {
      const item = cart.find(i => i.id === `${v.id}__${v.talla}`)
      return sum + (item?.qty || 0)
    }, 0)
    return (
      <>
        <div
          onClick={() => setOpen(true)}
          className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow border border-[#E8E8E8] flex flex-col cursor-pointer active:scale-[0.98]"
        >
          <div className="relative aspect-square bg-gray-100 overflow-hidden">
            {base.imagen_url && !imgError ? (
              <img src={base.imagen_url} alt={product.nombre} className="absolute inset-0 w-full h-full object-cover" onError={() => setImgError(true)} />
            ) : <ImagePlaceholder />}
            {totalInCart > 0 && (
              <span className="absolute top-2 right-2 bg-[#00A650] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{totalInCart}</span>
            )}
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{product.variants.length} sizes</div>
          </div>
          <div className="p-3 flex flex-col flex-1">
            <p className="text-[10px] text-[#FF6A00] uppercase tracking-wide font-semibold mb-0.5">{product.categoria}</p>
            {product.subcategoria && <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-0.5">{product.subcategoria}</p>}
            <h3 className="font-semibold text-[#333] text-sm leading-snug mb-2">{product.nombre}</h3>
            <button
              onClick={e => { e.stopPropagation(); setOpen(true) }}
              className="mt-auto w-full py-2 bg-[#FF6A00] text-white text-xs font-semibold rounded-xl hover:bg-[#E55A00] transition-colors"
            >
              {totalInCart > 0 ? `Selected · ${totalInCart} pcs` : 'Select sizes'}
            </button>
          </div>
        </div>
        {open && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-gray-100">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{product.categoria}{product.subcategoria ? ` · ${product.subcategoria}` : ''}</p>
                  <h2 className="font-bold text-gray-900 text-base leading-snug mt-0.5">{product.nombre}</h2>
                </div>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-200">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
                {product.variants.map(variant => {
                  const cartId = `${variant.id}__${variant.talla}`
                  const inCart = cart.find(i => i.id === cartId)?.qty || 0
                  return (
                    <div key={variant.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${inCart > 0 ? 'border-[#FF6A00] bg-orange-50' : 'border-gray-200'}`}>
                      <span className="text-sm font-bold text-gray-900 w-12">{variant.talla}</span>
                      {inCart > 0 ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => onRemove(cartId)} className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-700">−</button>
                          <span className="text-sm font-bold text-gray-900 w-5 text-center">{inCart}</span>
                          <button onClick={() => onAdd(variant, variant.talla)} className="w-7 h-7 rounded-lg bg-[#FF6A00] hover:bg-[#E55A00] flex items-center justify-center text-sm font-bold text-white">+</button>
                        </div>
                      ) : (
                        <button onClick={() => onAdd(variant, variant.talla)} className="px-3 py-1.5 bg-[#FF6A00] text-white text-xs font-semibold rounded-xl hover:bg-[#E55A00]">Add</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Caso simple / con tallas ──────────────────────────────────
  const hasSizes = product.tallas?.length > 0
  const qty = cart.filter(i => i.productId === product.id && !i.size).reduce((s, i) => s + i.qty, 0)
  const cartSizes = cart.filter(i => i.productId === product.id && i.size).reduce((acc, i) => ({ ...acc, [i.size]: i.qty }), {})
  const totalSizedQty = Object.values(cartSizes).reduce((s, q) => s + q, 0)

  return (
    <div className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow border border-[#E8E8E8] flex flex-col">
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.imagen_url && !imgError ? (
          <img src={product.imagen_url} alt={product.nombre} className="absolute inset-0 w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : <ImagePlaceholder />}
        {(hasSizes ? totalSizedQty : qty) > 0 && (
          <span className="absolute top-2 right-2 bg-[#00A650] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{hasSizes ? totalSizedQty : qty}</span>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="text-[10px] text-[#FF6A00] uppercase tracking-wide font-semibold mb-0.5">{product.categoria}</p>
        {product.subcategoria && <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-0.5">{product.subcategoria}</p>}
        <h3 className="font-semibold text-[#333] text-sm leading-snug mb-1">{product.nombre}</h3>
        {product.descripcion && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{product.descripcion}</p>}

        <div className="mt-auto pt-1 flex items-center justify-end gap-2">
          {!hasSizes && (
            qty > 0 ? (
              <div className="flex items-center gap-1.5">
                <button onClick={() => onRemove(product.id)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-lg leading-none text-gray-700">−</button>
                {editingQty ? (
                  <input
                    type="number" min={1} autoFocus value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onBlur={() => { const n = parseInt(inputVal); if (n >= 1) onSetQty(product.id, n); setEditingQty(false) }}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingQty(false) }}
                    className="w-9 h-9 text-center font-semibold text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#FF6A00]"
                  />
                ) : (
                  <span onClick={() => { setInputVal(String(qty)); setEditingQty(true) }} className="w-9 h-9 text-center font-semibold text-sm cursor-pointer hover:bg-gray-100 rounded-lg flex items-center justify-center">{qty}</span>
                )}
                <button onClick={() => onAdd(product)} className="w-9 h-9 rounded-full bg-[#FF6A00] hover:bg-[#E55A00] flex items-center justify-center font-bold text-lg leading-none text-white">+</button>
              </div>
            ) : (
              <button onClick={() => onAdd(product)} className="px-4 py-2 bg-[#FF6A00] text-white text-xs font-semibold rounded-xl hover:bg-[#E55A00] transition-colors">Add</button>
            )
          )}
          {hasSizes && (
            <button onClick={() => setShowSizes(v => !v)} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#FF6A00] text-white hover:bg-[#E55A00] transition-colors">
              {totalSizedQty > 0 ? `${totalSizedQty} pcs ▾` : 'Add'}
            </button>
          )}
        </div>

        {hasSizes && showSizes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">Select size:</p>
            <div className="flex flex-wrap gap-2">
              {product.tallas.map(size => {
                const sizeQty = cartSizes?.[size] || 0
                const cartId = `${product.id}__${size}`
                return (
                  <div key={size} className="flex items-center gap-1">
                    {sizeQty > 0 ? (
                      <>
                        <button onClick={() => onRemove(cartId)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">−</button>
                        <div className="flex flex-col items-center min-w-[28px]">
                          <span className="text-sm font-bold text-gray-900 leading-none">{sizeQty}</span>
                          <span className="text-xs text-gray-500 leading-none">{size}</span>
                        </div>
                        <button onClick={() => onAdd(product, size)} className="w-8 h-8 rounded-lg bg-[#FF6A00] hover:bg-[#E55A00] flex items-center justify-center text-sm font-bold text-white">+</button>
                      </>
                    ) : (
                      <button onClick={() => onAdd(product, size)} className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:border-[#FF6A00] hover:text-[#FF6A00] transition-colors">{size}</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
