'use client'
import { useState, useEffect } from 'react'

export default function AdminAloInventory({ adminPassword }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ product_nombre: '', talla: '', stock: '' })
  const [addError, setAddError] = useState(null)

  const headers = { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }

  function load() {
    setLoading(true)
    fetch('/api/admin/alo-inventory', { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRows(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function saveEdit(id) {
    setSaving(true)
    const res = await fetch('/api/admin/alo-inventory', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id, stock: parseInt(editVal) || 0 }),
    })
    const data = await res.json()
    if (!data.error) {
      setRows(prev => prev.map(r => r.id === id ? data : r))
      setEditingId(null)
    }
    setSaving(false)
  }

  async function addRow() {
    if (!addForm.product_nombre.trim() || !addForm.talla.trim()) {
      setAddError('Nombre y talla son requeridos')
      return
    }
    setAddError(null)
    const res = await fetch('/api/admin/alo-inventory', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        product_nombre: addForm.product_nombre.trim(),
        talla: addForm.talla.trim(),
        stock: parseInt(addForm.stock) || 0,
      }),
    })
    const data = await res.json()
    if (data.error) { setAddError(data.error); return }
    setRows(prev => [...prev, data].sort((a, b) =>
      a.product_nombre.localeCompare(b.product_nombre) || a.talla.localeCompare(b.talla)
    ))
    setAddForm({ product_nombre: '', talla: '', stock: '' })
    setShowAdd(false)
  }

  async function deleteRow(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await fetch(`/api/admin/alo-inventory?id=${id}`, { method: 'DELETE', headers })
    setRows(prev => prev.filter(r => r.id !== id))
  }

  // Agrupar por producto
  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.product_nombre]) acc[row.product_nombre] = []
    acc[row.product_nombre].push(row)
    return acc
  }, {})

  const totalOut = rows.filter(r => r.stock === 0).length
  const totalLow = rows.filter(r => r.stock > 0 && r.stock <= 5).length

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-700">Stock Alo Yoga</h3>
          <p className="text-xs text-gray-400 mt-0.5">Se descuenta automáticamente al confirmar pedidos</p>
          {(totalOut > 0 || totalLow > 0) && (
            <div className="flex gap-2 mt-1">
              {totalOut > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">{totalOut} agotado{totalOut !== 1 ? 's' : ''}</span>}
              {totalLow > 0 && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">{totalLow} bajo</span>}
            </div>
          )}
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setAddError(null) }}
          className="text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
        >
          + Agregar
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-xs text-gray-400 italic">Sin registros. Agrega productos con su stock inicial.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([nombre, tallaRows]) => (
            <div key={nombre} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
              <p className="text-sm font-bold text-gray-900 mb-2">{nombre}</p>
              <div className="flex flex-wrap gap-2">
                {tallaRows.map(row => {
                  const isOut = row.stock === 0
                  const isLow = row.stock > 0 && row.stock <= 5
                  return (
                    <div key={row.id} className={`rounded-xl px-3 py-2 text-center min-w-[60px] relative group ${
                      isOut ? 'bg-red-50 border border-red-200' : isLow ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                    }`}>
                      <p className="text-xs text-gray-500 mb-1">{row.talla}</p>
                      {editingId === row.id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number" min="0"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            className="w-12 text-center text-sm font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit(row.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                          />
                          <button onClick={() => saveEdit(row.id)} disabled={saving}
                            className="text-green-600 font-bold text-sm">✓</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(row.id); setEditVal(String(row.stock)) }}
                          className="block w-full"
                        >
                          <p className={`text-base font-bold ${isOut ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                            {row.stock}
                          </p>
                          <p className={`text-[10px] ${isOut ? 'text-red-400' : isLow ? 'text-amber-500' : 'text-gray-400'}`}>
                            {isOut ? 'Agotado' : isLow ? 'Stock bajo' : 'disp.'}
                          </p>
                        </button>
                      )}
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-gray-200 hover:bg-red-200 text-gray-500 hover:text-red-600 rounded-full text-[10px] items-center justify-center hidden group-hover:flex transition-colors"
                      >×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4 space-y-3">
          <p className="text-sm font-bold text-gray-900">Agregar talla</p>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-xs text-gray-400 block mb-1">Nombre del producto</label>
              <input type="text" value={addForm.product_nombre} placeholder="Ej: Alo Hat"
                onChange={e => setAddForm(f => ({ ...f, product_nombre: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Talla</label>
              <input type="text" value={addForm.talla} placeholder="S, M, L, única..."
                onChange={e => setAddForm(f => ({ ...f, talla: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Stock inicial</label>
              <input type="number" min="0" value={addForm.stock}
                onChange={e => setAddForm(f => ({ ...f, stock: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addRow}
              className="px-5 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors">
              Agregar
            </button>
            <button onClick={() => { setShowAdd(false); setAddError(null) }}
              className="px-5 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
