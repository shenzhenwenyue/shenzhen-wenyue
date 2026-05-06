'use client'
import { useState, useEffect } from 'react'

export default function AdminAloInventory({ adminPassword }) {
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState({})
  const [editing, setEditing] = useState({})
  const [saving, setSaving] = useState({})
  const [loading, setLoading] = useState(true)

  const headers = { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/admin/inventory', { headers }).then(r => r.json()),
    ]).then(([prods, inv]) => {
      if (Array.isArray(prods)) setProducts(prods.filter(p => p.categoria === 'Alo Yoga'))
      if (Array.isArray(inv)) {
        const map = {}
        inv.forEach(row => { map[row.nombre] = row.stock })
        setInventory(map)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function startEdit(nombre) {
    setEditing(e => ({ ...e, [nombre]: String(inventory[nombre] ?? 0) }))
  }

  async function saveStock(nombre) {
    const stock = parseInt(editing[nombre])
    if (isNaN(stock) || stock < 0) return
    setSaving(s => ({ ...s, [nombre]: true }))
    await fetch('/api/admin/inventory', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ nombre, stock }),
    })
    setInventory(inv => ({ ...inv, [nombre]: stock }))
    setEditing(e => { const n = { ...e }; delete n[nombre]; return n })
    setSaving(s => { const n = { ...s }; delete n[nombre]; return n })
  }

  const totalOut = Object.values(inventory).filter(v => v === 0).length
  const totalLow = Object.values(inventory).filter(v => v > 0 && v <= 5).length

  const stockColor = (stock) => {
    if (stock === null || stock === undefined) return 'text-gray-400'
    if (stock === 0) return 'text-red-500'
    if (stock <= 5) return 'text-amber-500'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
      </div>
    )
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-700">Stock Alo Yoga</h3>
          <p className="text-xs text-gray-400 mt-0.5">Actualiza cuando llegue mercancía a bodega</p>
          {(totalOut > 0 || totalLow > 0) && (
            <div className="flex gap-2 mt-1.5">
              {totalOut > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">{totalOut} agotado{totalOut !== 1 ? 's' : ''}</span>}
              {totalLow > 0 && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">{totalLow} stock bajo</span>}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {products.map(p => {
          const stock = inventory[p.nombre] ?? null
          const isEditing = p.nombre in editing
          const isOut = stock === 0
          const isLow = stock !== null && stock > 0 && stock <= 5

          return (
            <div key={p.id} className={`bg-white rounded-2xl border shadow-sm px-4 py-3 flex items-center justify-between gap-3 ${
              isOut ? 'border-red-200' : isLow ? 'border-amber-200' : 'border-gray-100'
            }`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                <p className="text-xs text-gray-400">{p.subcategoria}</p>
              </div>

              {isEditing ? (
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    autoFocus
                    value={editing[p.nombre]}
                    onChange={e => setEditing(ed => ({ ...ed, [p.nombre]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveStock(p.nombre)
                      if (e.key === 'Escape') setEditing(ed => { const n = { ...ed }; delete n[p.nombre]; return n })
                    }}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-xl text-sm text-center focus:outline-none focus:border-black"
                  />
                  <button
                    onClick={() => saveStock(p.nombre)}
                    disabled={saving[p.nombre]}
                    className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                  >
                    {saving[p.nombre] ? '…' : 'OK'}
                  </button>
                  <button
                    onClick={() => setEditing(e => { const n = { ...e }; delete n[p.nombre]; return n })}
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${stockColor(stock)}`}>
                      {stock === null ? '—' : `${stock} pz`}
                    </span>
                    {isOut && <p className="text-[10px] text-red-400">Agotado</p>}
                    {isLow && <p className="text-[10px] text-amber-500">Stock bajo</p>}
                  </div>
                  <button
                    onClick={() => startEdit(p.nombre)}
                    className="text-xs text-gray-400 hover:text-gray-900 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {products.length === 0 && (
          <p className="text-xs text-gray-400">No hay productos Alo Yoga en el catálogo.</p>
        )}
      </div>
    </div>
  )
}
