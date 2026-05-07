'use client'
import { useState, useEffect } from 'react'

const LOW_THRESHOLD = 5

function StockBadge({ stock }) {
  if (stock === null || stock === undefined)
    return <span className="text-xs text-gray-300 font-medium">—</span>
  if (stock === 0)
    return <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Agotado</span>
  if (stock <= LOW_THRESHOLD)
    return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{stock} pz</span>
  return <span className="text-sm font-bold text-green-600">{stock} pz</span>
}

function ProductRow({ product, stock, destacado, onSaveStock, onSaveDestacado }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingDest, setTogglingDest] = useState(false)

  function startEdit() {
    setVal(String(stock ?? 0))
    setEditing(true)
  }

  async function save() {
    const n = parseInt(val)
    if (isNaN(n) || n < 0) return
    setSaving(true)
    await onSaveStock(product.nombre, n)
    setSaving(false)
    setEditing(false)
  }

  async function toggleDestacado() {
    setTogglingDest(true)
    await onSaveDestacado(product.nombre, !destacado)
    setTogglingDest(false)
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800 truncate">{product.nombre}</p>
        {product.subcategoria && (
          <p className="text-xs text-gray-400">{product.subcategoria}</p>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number" min={0} autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            className="w-20 px-2 py-1 border border-gray-300 rounded-xl text-sm text-center focus:outline-none focus:border-black"
          />
          <button onClick={save} disabled={saving}
            className="px-3 py-1 bg-black text-white text-xs font-semibold rounded-xl disabled:opacity-50">
            {saving ? '…' : 'OK'}
          </button>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-700 text-xs px-1">✕</button>
        </div>
      ) : (
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleDestacado}
            disabled={togglingDest}
            title={destacado ? 'Quitar Top' : 'Marcar como Top'}
            className={`text-base leading-none transition-opacity ${togglingDest ? 'opacity-40' : ''} ${destacado ? 'text-amber-400' : 'text-gray-200 hover:text-amber-300'}`}
          >
            ★
          </button>
          <StockBadge stock={stock} />
          <button onClick={startEdit}
            className="text-xs text-gray-400 hover:text-gray-900 px-2.5 py-1 rounded-xl hover:bg-gray-100 transition-colors font-medium">
            Editar
          </button>
        </div>
      )}
    </div>
  )
}

function CategorySection({ categoria, products, inventory, destacadoMap, onSaveStock, onSaveDestacado }) {
  const [open, setOpen] = useState(false)

  const tracked = products.filter(p => inventory[p.nombre] !== undefined)
  const outOfStock = tracked.filter(p => inventory[p.nombre] === 0).length
  const lowStock = tracked.filter(p => inventory[p.nombre] > 0 && inventory[p.nombre] <= LOW_THRESHOLD).length
  const totalTracked = tracked.length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-900">{categoria}</span>
          <span className="text-xs text-gray-400">{products.length} productos</span>
          {outOfStock > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
              {outOfStock} agotado{outOfStock !== 1 ? 's' : ''}
            </span>
          )}
          {lowStock > 0 && (
            <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">
              {lowStock} bajo
            </span>
          )}
          {totalTracked === 0 && (
            <span className="text-xs text-gray-300">sin stock registrado</span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-3 border-t border-gray-50">
          {products.map(p => (
            <ProductRow
              key={p.id}
              product={p}
              stock={inventory[p.nombre] ?? null}
              destacado={destacadoMap[p.nombre] ?? false}
              onSaveStock={onSaveStock}
              onSaveDestacado={onSaveDestacado}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminStock({ adminPassword }) {
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState({})
  const [destacadoMap, setDestacadoMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const headers = { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }

  useEffect(() => {
    if (!adminPassword) return
    const hdrs = { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/admin/inventory', { headers: hdrs }).then(r => r.ok ? r.json() : []),
    ]).then(([prods, inv]) => {
      if (Array.isArray(prods)) setProducts(prods)
      else setError('Error cargando productos')
      if (Array.isArray(inv)) {
        const stockMap = {}
        const destMap = {}
        inv.forEach(row => {
          stockMap[row.nombre] = row.stock
          destMap[row.nombre] = row.destacado ?? false
        })
        setInventory(stockMap)
        setDestacadoMap(destMap)
      }
      setLoading(false)
    }).catch(() => { setError('Error de conexión'); setLoading(false) })
  }, [adminPassword])

  async function handleSaveStock(nombre, stock) {
    const res = await fetch('/api/admin/inventory', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ nombre, stock }),
    })
    const data = await res.json()
    if (!data.error) setInventory(inv => ({ ...inv, [nombre]: stock }))
  }

  async function handleSaveDestacado(nombre, destacado) {
    const res = await fetch('/api/admin/inventory', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ nombre, destacado }),
    })
    const data = await res.json()
    if (!data.error) setDestacadoMap(d => ({ ...d, [nombre]: destacado }))
  }

  const byCategoria = products.reduce((acc, p) => {
    const cat = p.categoria || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const totalOut = Object.values(inventory).filter(v => v === 0).length
  const totalLow = Object.values(inventory).filter(v => v > 0 && v <= LOW_THRESHOLD).length

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 bg-white rounded-2xl animate-pulse border border-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-gray-900">Control de Stock</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Actualiza las cantidades cuando llegue mercancía. Solo necesitas registrar los productos que quieres rastrear.
        </p>
      </div>

      {(totalOut > 0 || totalLow > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-amber-600 text-sm font-semibold">Alertas:</span>
          {totalOut > 0 && <span className="text-xs text-red-600 font-semibold">{totalOut} producto{totalOut !== 1 ? 's' : ''} agotado{totalOut !== 1 ? 's' : ''}</span>}
          {totalOut > 0 && totalLow > 0 && <span className="text-gray-300">·</span>}
          {totalLow > 0 && <span className="text-xs text-amber-600 font-semibold">{totalLow} con stock bajo</span>}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-3">
        {Object.entries(byCategoria).map(([cat, prods]) => (
          <CategorySection
            key={cat}
            categoria={cat}
            products={prods}
            inventory={inventory}
            destacadoMap={destacadoMap}
            onSaveStock={handleSaveStock}
            onSaveDestacado={handleSaveDestacado}
          />
        ))}
      </div>
    </div>
  )
}
