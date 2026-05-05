'use client'
import { useState, useEffect } from 'react'

function pct(precio, costo) {
  if (!precio || !costo) return null
  return Math.round(((precio - costo) / costo) * 100)
}

function MarginBadge({ precio, costo }) {
  const p = pct(precio, costo)
  if (p === null) return null
  const cls = p >= 70
    ? 'bg-green-100 text-green-700'
    : p >= 50
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-orange-100 text-orange-700'
  return <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${cls}`}>{p}%</span>
}

const TIERS = [
  { field: 'precio_10', label: '10–24 pz' },
  { field: 'precio_25', label: '25–49 pz' },
  { field: 'precio_50', label: '50–99 pz' },
  { field: 'precio_100', label: '100+ pz' },
]

export default function AdminLululemonPricing({ adminPassword }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const headers = { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }

  useEffect(() => { fetchRows() }, [])

  async function fetchRows() {
    setLoading(true)
    const res = await fetch('/api/admin/lululemon-pricing', { headers })
    const data = await res.json()
    if (Array.isArray(data)) setRows(data)
    else setError(data.error || 'Error cargando precios')
    setLoading(false)
  }

  function startEdit(row) {
    setEditing(row.id)
    setEditForm({
      costo: row.costo,
      precio_10: row.precio_10,
      precio_25: row.precio_25,
      precio_50: row.precio_50,
      precio_100: row.precio_100,
    })
    setError(null)
  }

  async function saveEdit() {
    setSaving(true)
    const res = await fetch('/api/admin/lululemon-pricing', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id: editing, ...editForm }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setSaving(false); return }
    setRows(prev => prev.map(r => r.id === editing ? data : r))
    setEditing(null)
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-gray-900">Precios Lululemon</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          MOQ 10 piezas. Precio por unidad según volumen total del pedido. Los porcentajes son tu margen sobre costo.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(row => (
            <div key={row.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {editing === row.id ? (
                <div className="px-4 py-4 space-y-3">
                  <p className="text-sm font-bold text-gray-900">{row.label}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Costo</label>
                      <input
                        type="number" step="0.01" min="0"
                        value={editForm.costo}
                        onChange={e => setEditForm(f => ({ ...f, costo: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    {TIERS.map(({ field, label }) => (
                      <div key={field}>
                        <label className="text-xs text-gray-400 block mb-1">{label}</label>
                        <input
                          type="number" step="0.01" min="0"
                          value={editForm[field]}
                          onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400"
                        />
                        {editForm[field] && editForm.costo && (
                          <p className="text-center mt-0.5">
                            <MarginBadge precio={parseFloat(editForm[field])} costo={parseFloat(editForm.costo)} />
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="px-5 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="px-5 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{row.label}</p>
                      <p className="text-xs text-gray-400">Costo: ${parseFloat(row.costo).toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => startEdit(row)}
                      className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                    >
                      Editar
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {TIERS.map(({ field, label }) => (
                      <div key={field} className="bg-gray-50 rounded-xl px-2 py-2 text-center">
                        <p className="text-xs text-gray-400 mb-1">{label}</p>
                        <p className="text-base font-bold text-gray-900">${parseFloat(row[field]).toFixed(0)}</p>
                        <div className="mt-1">
                          <MarginBadge precio={row[field]} costo={row.costo} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Leyenda */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center gap-3 px-1">
          <p className="text-xs text-gray-400">Margen:</p>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">+70%</span>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">50–70%</span>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">&lt;50%</span>
        </div>
      )}
    </div>
  )
}
