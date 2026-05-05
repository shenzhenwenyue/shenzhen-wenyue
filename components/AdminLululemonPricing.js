'use client'
import { useState, useEffect, useMemo } from 'react'

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

const EMPTY_FORM = { label: '', costo: '', precio_10: '', precio_25: '', precio_50: '', precio_100: '' }

// ── Shared brand pricing row (Lululemon / Alo) ──────────────────────────────
function BrandRow({ row, adminPassword, headers, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function startEdit() {
    setForm({
      costo: row.costo,
      precio_10: row.precio_10,
      precio_25: row.precio_25,
      precio_50: row.precio_50,
      precio_100: row.precio_100,
    })
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/admin/lululemon-pricing', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id: row.id, ...form }),
    })
    const data = await res.json()
    setSaving(false)
    if (!data.error) { onSave(data); setEditing(false) }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${row.label}"?`)) return
    setDeleting(true)
    await fetch(`/api/admin/lululemon-pricing?id=${row.id}`, { method: 'DELETE', headers })
    onDelete(row.id)
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 space-y-3">
        <p className="text-sm font-bold text-gray-900">{row.label}</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Costo</label>
            <input type="number" step="0.01" min="0" value={form.costo}
              onChange={e => setForm(f => ({ ...f, costo: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
          </div>
          {TIERS.map(({ field, label }) => (
            <div key={field}>
              <label className="text-xs text-gray-400 block mb-1">{label}</label>
              <input type="number" step="0.01" min="0" value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
              {form[field] && form.costo && (
                <p className="text-center mt-0.5">
                  <MarginBadge precio={parseFloat(form[field])} costo={parseFloat(form.costo)} />
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={() => setEditing(false)}
            className="px-5 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-bold text-gray-900">{row.label}</p>
            <p className="text-xs text-gray-400">Costo: ${parseFloat(row.costo).toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={startEdit}
              className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors font-medium">
              Editar
            </button>
            {row.marca === 'Alo' && (
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-xl hover:bg-red-50 transition-colors">
                {deleting ? '…' : '✕'}
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {TIERS.map(({ field, label }) => (
            <div key={field} className="bg-gray-50 rounded-xl px-2 py-2 text-center">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-base font-bold text-gray-900">${parseFloat(row[field]).toFixed(0)}</p>
              <div className="mt-1"><MarginBadge precio={row[field]} costo={row.costo} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Add Alo row form ─────────────────────────────────────────────────────────
function AddAloForm({ headers, onAdd, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit() {
    if (!form.label.trim() || !form.costo) { setError('Nombre y costo son requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/admin/lululemon-pricing', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...form, marca: 'Alo' }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) { setError(data.error); return }
    onAdd(data)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4 space-y-3">
      <p className="text-sm font-bold text-gray-900">Nuevo producto Alo Yoga</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Nombre del producto</label>
        <input type="text" value={form.label} placeholder="Ej: Define Jacket"
          onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Costo</label>
          <input type="number" step="0.01" min="0" value={form.costo}
            onChange={e => setForm(f => ({ ...f, costo: e.target.value }))}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
        </div>
        {TIERS.map(({ field, label }) => (
          <div key={field}>
            <label className="text-xs text-gray-400 block mb-1">{label}</label>
            <input type="number" step="0.01" min="0" value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
            {form[field] && form.costo && (
              <p className="text-center mt-0.5">
                <MarginBadge precio={parseFloat(form[field])} costo={parseFloat(form.costo)} />
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving}
          className="px-5 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {saving ? 'Guardando…' : 'Agregar'}
        </button>
        <button onClick={onCancel}
          className="px-5 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

function perfumeTiers(p) {
  return [
    { qty: 1, price: p.precio_1 },
    p.qty_tier2 && p.precio_tier2 ? { qty: p.qty_tier2, price: p.precio_tier2 } : null,
    p.qty_tier3 && p.precio_tier3 ? { qty: p.qty_tier3, price: p.precio_tier3 } : null,
    p.qty_tier4 && p.precio_tier4 ? { qty: p.qty_tier4, price: p.precio_tier4 } : null,
    p.qty_tier5 && p.precio_tier5 ? { qty: p.qty_tier5, price: p.precio_tier5 } : null,
  ].filter(Boolean)
}

function PerfumeGroupCard({ label, products, tiers, storageKey }) {
  const [open, setOpen] = useState(false)
  const [editingCosto, setEditingCosto] = useState(false)
  const [costoInput, setCostoInput] = useState('')
  const [costo, setCosto] = useState(() => {
    try { return parseFloat(localStorage.getItem(storageKey)) || null } catch { return null }
  })

  function saveCosto() {
    const v = parseFloat(costoInput)
    if (!v || v <= 0) return
    try { localStorage.setItem(storageKey, String(v)) } catch {}
    setCosto(v)
    setEditingCosto(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{label}</p>
          {editingCosto ? (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-gray-400">Costo $</span>
              <input
                type="number" step="0.01" min="0"
                value={costoInput}
                onChange={e => setCostoInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveCosto()}
                autoFocus
                className="w-20 px-1.5 py-0.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-gray-500"
              />
              <button onClick={saveCosto} className="text-xs font-semibold text-black px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200">OK</button>
              <button onClick={() => setEditingCosto(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
            </div>
          ) : (
            <button
              onClick={() => { setCostoInput(costo ? String(costo) : ''); setEditingCosto(true) }}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
              {costo ? `Costo: $${costo.toFixed(2)} · editar` : '+ Agregar costo'}
            </button>
          )}
        </div>
        <button onClick={() => setOpen(o => !o)}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors self-start pt-0.5">
          {open ? 'Ocultar ▲' : `Ver (${products.length}) ▼`}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tiers.map(({ qty, price }, idx) => (
          <div key={idx} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-gray-400 mb-1">{qty === 1 ? '1 pz' : `${qty}+ pz`}</p>
            <p className="text-sm font-bold text-gray-900">${price.toFixed(2)}</p>
            {costo && (
              <div className="mt-1"><MarginBadge precio={price} costo={costo} /></div>
            )}
          </div>
        ))}
      </div>
      {open && (
        <ul className="mt-3 space-y-0.5 border-t border-gray-100 pt-2">
          {products.map(p => (
            <li key={p.id} className="text-xs text-gray-500">• {p.nombre}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Perfumes section ─────────────────────────────────────────────────────────
function PerfumesSection({ adminPassword }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products', { headers: { 'x-admin-password': adminPassword } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data.filter(p => p.categoria?.toLowerCase() === 'perfumes'))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const { lv, rest } = useMemo(() => {
    const lv = products.filter(p => p.nombre.toLowerCase().includes('louis vuitton'))
    const rest = products.filter(p => !p.nombre.toLowerCase().includes('louis vuitton'))
    return { lv, rest }
  }, [products])

  if (loading) {
    return (
      <div className="space-y-2 mt-3">
        {[1, 2].map(i => <div key={i} className="h-14 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
      </div>
    )
  }

  if (!products.length) {
    return <p className="text-xs text-gray-400 mt-3">No hay perfumes en el catálogo.</p>
  }

  return (
    <div className="mt-3 space-y-2">
      {rest.length > 0 && (
        <PerfumeGroupCard
          label="Perfumes"
          products={rest}
          tiers={perfumeTiers(rest[0])}
          storageKey="perfume_costo_general"
        />
      )}
      {lv.length > 0 && (
        <PerfumeGroupCard
          label="Louis Vuitton"
          products={lv}
          tiers={perfumeTiers(lv[0])}
          storageKey="perfume_costo_lv"
        />
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AdminLululemonPricing({ adminPassword }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddAlo, setShowAddAlo] = useState(false)

  const headers = { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }

  useEffect(() => {
    fetch('/api/admin/lululemon-pricing', { headers })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRows(data)
        else setError(data.error || 'Error cargando precios')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const lululemonRows = rows.filter(r => r.marca === 'Lululemon')
  const aloRows = rows.filter(r => r.marca === 'Alo')

  function handleSave(updated) {
    setRows(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  function handleDelete(id) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function handleAddAlo(newRow) {
    setRows(prev => [...prev, newRow])
    setShowAddAlo(false)
  }

  const skeleton = (
    <div className="space-y-2">
      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-gray-900">Tabla de Costos</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Consulta y edita precios por volumen. Los porcentajes son tu margen sobre costo.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* ── Lululemon ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold text-gray-700">Lululemon</h3>
          <span className="text-xs text-gray-400">MOQ 10 pz</span>
        </div>
        {loading ? skeleton : (
          <div className="space-y-2">
            {lululemonRows.map(row => (
              <BrandRow key={row.id} row={row} adminPassword={adminPassword} headers={headers}
                onSave={handleSave} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* ── Alo Yoga ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-700">Alo Yoga</h3>
            <span className="text-xs text-gray-400">MOQ 10 pz</span>
          </div>
          {!showAddAlo && (
            <button onClick={() => setShowAddAlo(true)}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
              + Agregar
            </button>
          )}
        </div>
        {loading ? skeleton : (
          <div className="space-y-2">
            {aloRows.map(row => (
              <BrandRow key={row.id} row={row} adminPassword={adminPassword} headers={headers}
                onSave={handleSave} onDelete={handleDelete} />
            ))}
            {aloRows.length === 0 && !showAddAlo && (
              <p className="text-xs text-gray-400">Sin productos Alo todavía.</p>
            )}
            {showAddAlo && (
              <AddAloForm headers={headers} onAdd={handleAddAlo} onCancel={() => setShowAddAlo(false)} />
            )}
          </div>
        )}
      </div>

      {/* ── Perfumes ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-bold text-gray-700">Perfumes</h3>
          <span className="text-xs text-gray-400">Desde catálogo</span>
        </div>
        <p className="text-xs text-gray-400">Solo consulta — edita en el Sheet.</p>
        <PerfumesSection adminPassword={adminPassword} />
      </div>

      {/* Leyenda */}
      {!loading && (
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
