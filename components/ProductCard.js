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

export default function ProductCard({ product, cartQty, onAdd, onRemove, onSetQty }) {
  const [imgError, setImgError] = useState(false)
  const [editingQty, setEditingQty] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const qty = cartQty || 0
  const currentPrice = getPrecio(product, qty || 1)
  const hasTiers = product.qty_tier2 || product.qty_tier3

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
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{product.nombre}</h3>

        {product.descripcion && (
          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{product.descripcion}</p>
        )}

        {/* Tabla de precios por volumen */}
        {hasTiers && (
          <div className="mb-2 rounded-lg bg-gray-50 p-2 space-y-0.5 text-xs">
            <TierRow
              label={`1${product.qty_tier2 ? `–${product.qty_tier2 - 1}` : '+'} u.`}
              price={product.precio_1}
              active={qty === 0 || qty < (product.qty_tier2 || Infinity)}
            />
            {product.qty_tier2 && product.precio_tier2 && (
              <TierRow
                label={`${product.qty_tier2}${product.qty_tier3 ? `–${product.qty_tier3 - 1}` : '+'} u.`}
                price={product.precio_tier2}
                active={qty >= product.qty_tier2 && (!product.qty_tier3 || qty < product.qty_tier3)}
                highlight
              />
            )}
            {product.qty_tier3 && product.precio_tier3 && (
              <TierRow
                label={`${product.qty_tier3}+ u.`}
                price={product.precio_tier3}
                active={qty >= product.qty_tier3}
                highlight
              />
            )}
          </div>
        )}

        {/* Precio actual + controles */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div>
            <span className="text-base font-bold text-gray-900">${currentPrice.toFixed(2)}</span>
            <span className="text-xs text-gray-400 ml-1">c/u</span>
          </div>

          {qty > 0 ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onRemove(product.id)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-base leading-none text-gray-700"
                aria-label="Quitar"
              >
                −
              </button>
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
                  className="w-10 text-center font-semibold text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                />
              ) : (
                <span
                  onClick={() => { setInputVal(String(qty)); setEditingQty(true) }}
                  className="w-8 text-center font-semibold text-sm cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
                  title="Toca para editar"
                >
                  {qty}
                </span>
              )}
              <button
                onClick={() => onAdd(product)}
                className="w-7 h-7 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center font-bold text-base leading-none text-white"
                aria-label="Agregar"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAdd(product)}
              className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Agregar
            </button>
          )}
        </div>

        {product.qty_minima > 1 && (
          <p className="text-xs text-gray-400 mt-1">Min. {product.qty_minima} unidades</p>
        )}
      </div>
    </div>
  )
}

function TierRow({ label, price, active, highlight }) {
  const activeColor = highlight ? 'text-green-600 font-semibold' : 'text-gray-800 font-semibold'
  return (
    <div className={`flex justify-between ${active ? activeColor : 'text-gray-400'}`}>
      <span>{label}</span>
      <span>${price.toFixed(2)}</span>
    </div>
  )
}
