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

function mkLabel(minQty, maxQty) {
  if (!maxQty) return `${minQty}+ pz`
  return `${minQty}–${maxQty - 1} pz`
}

function rowTiers(row) {
  return [
    row.precio_1 != null ? { price: row.precio_1, label: mkLabel(row.qty_minima || 1, row.qty_tier2) } : null,
    row.qty_tier2 && row.precio_tier2 != null ? { price: row.precio_tier2, label: mkLabel(row.qty_tier2, row.qty_tier3) } : null,
    row.qty_tier3 && row.precio_tier3 != null ? { price: row.precio_tier3, label: mkLabel(row.qty_tier3, row.qty_tier4) } : null,
    row.qty_tier4 && row.precio_tier4 != null ? { price: row.precio_tier4, label: `${row.qty_tier4}+ pz` } : null,
  ].filter(Boolean)
}

// ── BrandRow (Lululemon / Alo Yoga) ──────────────────────────────────────────
function BrandRow({ row, headers, onSave, onDelete, canDelete }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const tiers = rowTiers(row)
  const tierDefs = [
    { field: 'precio_1',     label: mkLabel(row.qty_minima || 10, row.qty_tier2 || 25) },
    { field: 'precio_tier2', label: mkLabel(row.qty_tier2 || 25, row.qty_tier3 || 50) },
    { field: 'precio_tier3', label: mkLabel(row.qty_tier3 || 50, row.qty_tier4 || 100) },
    { field: 'precio_tier4', label: `${row.qty_tier4 || 100}+ pz` },
  ]

  function startEdit() {
    setForm({
      costo:        row.costo        ?? '',
      precio_1:     row.precio_1     ?? '',
      precio_tier2: row.precio_tier2 ?? '',
      precio_tier3: row.precio_tier3 ?? '',
      precio_tier4: row.precio_tier4 ?? '',
    })
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/admin/catalog-pricing', {
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
    await fetch(`/api/admin/catalog-pricing?id=${row.id}`, { method: 'DELETE', headers })
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
          {tierDefs.map(({ field, label }) => (
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
            {row.nombre_match && (
              <p className="text-xs text-blue-500 mb-0.5">Aplica a: nombres que incluyen "{row.nombre_match}"</p>
            )}
            {row.costo
              ? <p className="text-xs text-gray-400">Costo: ${parseFloat(row.costo).toFixed(2)}</p>
              : <p className="text-xs text-orange-400">Sin costo — edita para agregar</p>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={startEdit}
              className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors font-medium">
              Editar
            </button>
            {canDelete && (
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-xl hover:bg-red-50 transition-colors">
                {deleting ? '…' : '✕'}
              </button>
            )}
          </div>
        </div>
        {tiers.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {tiers.map(({ price, label }, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl px-2 py-2 text-center">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-base font-bold text-gray-900">${parseFloat(price).toFixed(0)}</p>
                <div className="mt-1"><MarginBadge precio={price} costo={row.costo} /></div>
                {row.costo && <p className="text-xs text-emerald-600 font-semibold mt-0.5">+${(parseFloat(price) - parseFloat(row.costo)).toFixed(2)}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">Sin precios — haz clic en Editar</p>
        )}
      </div>
    </div>
  )
}

// ── AddBrandRowForm (Alo Yoga) ────────────────────────────────────────────────
const EMPTY_BRAND_FORM = { label: '', nombre_match: '', costo: '', precio_1: '', precio_tier2: '', precio_tier3: '', precio_tier4: '' }

function AddBrandRowForm({ categoria, headers, onAdd, onCancel }) {
  const [form, setForm] = useState(EMPTY_BRAND_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const tierDefs = [
    { field: 'precio_1',     label: '10–24 pz' },
    { field: 'precio_tier2', label: '25–49 pz' },
    { field: 'precio_tier3', label: '50–99 pz' },
    { field: 'precio_tier4', label: '100+ pz' },
  ]

  async function submit() {
    if (!form.label.trim() || !form.costo) { setError('Nombre y costo son requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/admin/catalog-pricing', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...form,
        nombre_match: form.nombre_match?.trim() || null,
        categoria,
        qty_minima: 10,
        qty_tier2: 25,
        qty_tier3: 50,
        qty_tier4: 100,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) { setError(data.error); return }
    onAdd(data)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4 space-y-3">
      <p className="text-sm font-bold text-gray-900">Nuevo producto {categoria}</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Nombre interno (etiqueta)</label>
        <input type="text" value={form.label} placeholder="Ej: Alo Jacket"
          onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400" />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Coincidencia en nombre del producto <span className="text-gray-300">(opcional — solo si dos modelos comparten subcategoría)</span></label>
        <input type="text" value={form.nombre_match} placeholder="Ej: Skirt + Top"
          onChange={e => setForm(f => ({ ...f, nombre_match: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400" />
        <p className="text-xs text-gray-300 mt-0.5">El sistema buscará este texto dentro del nombre del producto en el catálogo</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Costo</label>
          <input type="number" step="0.01" min="0" value={form.costo}
            onChange={e => setForm(f => ({ ...f, costo: e.target.value }))}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
        </div>
        {tierDefs.map(({ field, label }) => (
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

// ── GroupPricingCard (Perfumes / Louis Vuitton / Gift Sets) ───────────────────
function GroupPricingCard({ row, productNames, headers, onSave, hasCostTiers, costTiers, onCostTiersSave, costMatchCampo, costMatchValor }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [costForm, setCostForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [open, setOpen] = useState(false)

  const tiers = rowTiers(row)
  const costo = hasCostTiers
    ? (costTiers?.costo_1 != null ? parseFloat(costTiers.costo_1) : null)
    : (row.costo ? parseFloat(row.costo) : null)

  function startEdit() {
    setForm({
      costo:        row.costo        ?? '',
      precio_1:     row.precio_1     ?? '',
      qty_tier2:    row.qty_tier2    ?? '',
      precio_tier2: row.precio_tier2 ?? '',
      qty_tier3:    row.qty_tier3    ?? '',
      precio_tier3: row.precio_tier3 ?? '',
      qty_tier4:    row.qty_tier4    ?? '',
      precio_tier4: row.precio_tier4 ?? '',
    })
    if (hasCostTiers) {
      setCostForm({
        costo_1:     costTiers?.costo_1     ?? '',
        qty_tier2:   costTiers?.qty_tier2   ?? '',
        costo_tier2: costTiers?.costo_tier2 ?? '',
        qty_tier3:   costTiers?.qty_tier3   ?? '',
        costo_tier3: costTiers?.costo_tier3 ?? '',
        qty_tier4:   costTiers?.qty_tier4   ?? '',
        costo_tier4: costTiers?.costo_tier4 ?? '',
      })
    }
    setSaveError(null)
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    const res = await fetch('/api/admin/catalog-pricing', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id: row.id, ...form }),
    })
    const data = await res.json()
    if (data.error) { setSaveError(data.error); setSaving(false); return }

    if (hasCostTiers) {
      const costPayload = {
        nombre: costMatchValor || 'Louis Vuitton',
        match_campo: costMatchCampo || 'subcategoria',
        match_valor: costMatchValor || 'Louis Vuitton',
        fijo: false,
        costo_1:     costForm.costo_1     ? parseFloat(costForm.costo_1)     : null,
        qty_tier2:   costForm.qty_tier2   ? parseInt(costForm.qty_tier2)     : null,
        costo_tier2: costForm.costo_tier2 ? parseFloat(costForm.costo_tier2) : null,
        qty_tier3:   costForm.qty_tier3   ? parseInt(costForm.qty_tier3)     : null,
        costo_tier3: costForm.costo_tier3 ? parseFloat(costForm.costo_tier3) : null,
        qty_tier4:   costForm.qty_tier4   ? parseInt(costForm.qty_tier4)     : null,
        costo_tier4: costForm.costo_tier4 ? parseFloat(costForm.costo_tier4) : null,
      }
      const costRes = await fetch('/api/admin/costs', {
        method: costTiers?.id ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(costTiers?.id ? { id: costTiers.id, ...costPayload } : costPayload),
      })
      const costData = await costRes.json()
      if (costData.error) { setSaveError(costData.error); setSaving(false); return }
      onCostTiersSave?.(costData)
    }

    setSaving(false)
    onSave(data)
    setEditing(false)
  }

  const extraTiers = [
    { qtyField: 'qty_tier2', priceField: 'precio_tier2', placeholder: 'ej: 10' },
    { qtyField: 'qty_tier3', priceField: 'precio_tier3', placeholder: 'ej: 25' },
    { qtyField: 'qty_tier4', priceField: 'precio_tier4', placeholder: 'ej: 50' },
  ]

  if (editing) {
    const editCosto = hasCostTiers
      ? (costForm.costo_1 ? parseFloat(costForm.costo_1) : null)
      : (form.costo ? parseFloat(form.costo) : null)
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 space-y-4">
        <p className="text-sm font-bold text-gray-900">{row.label}</p>

        {/* Costo */}
        {hasCostTiers ? (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Costos de compra (volumen total perfumería)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-16 shrink-0">Base</span>
                <input type="number" step="0.01" min="0" value={costForm.costo_1}
                  placeholder="45.00"
                  onChange={e => setCostForm(f => ({ ...f, costo_1: e.target.value }))}
                  className="w-28 px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
              </div>
              {[
                { qty: 'qty_tier2', cst: 'costo_tier2', ph: '20' },
                { qty: 'qty_tier3', cst: 'costo_tier3', ph: '30' },
                { qty: 'qty_tier4', cst: 'costo_tier4', ph: '50' },
              ].map(({ qty, cst, ph }) => (
                <div key={qty} className="flex items-center gap-2">
                  <input type="number" min="1" value={costForm[qty]} placeholder={ph}
                    onChange={e => setCostForm(f => ({ ...f, [qty]: e.target.value }))}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
                  <span className="text-xs text-gray-400 shrink-0">+ pz →</span>
                  <input type="number" step="0.01" min="0" value={costForm[cst]}
                    placeholder="0.00"
                    onChange={e => setCostForm(f => ({ ...f, [cst]: e.target.value }))}
                    className="w-28 px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Costo de compra</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-10">$ USD</span>
              <input type="number" step="0.01" min="0" value={form.costo}
                placeholder="0.00"
                onChange={e => setForm(f => ({ ...f, costo: e.target.value }))}
                className="w-36 px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
            </div>
          </div>
        )}

        {/* Precios de venta */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Precios de venta</p>
          <div className="space-y-2">
            {/* 1 pz */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 shrink-0">1 pieza</span>
              <input type="number" step="0.01" min="0" value={form.precio_1}
                placeholder="0.00"
                onChange={e => setForm(f => ({ ...f, precio_1: e.target.value }))}
                className="w-28 px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
              {form.precio_1 && editCosto && (
                <MarginBadge precio={parseFloat(form.precio_1)} costo={editCosto} />
              )}
            </div>
            {/* Tiers */}
            {extraTiers.map(({ qtyField, priceField, placeholder }) => (
              <div key={qtyField} className="flex items-center gap-2">
                <input type="number" min="1" value={form[qtyField]} placeholder={placeholder}
                  onChange={e => setForm(f => ({ ...f, [qtyField]: e.target.value }))}
                  className="w-16 px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
                <span className="text-xs text-gray-400 shrink-0">+ pz</span>
                <input type="number" step="0.01" min="0" value={form[priceField]}
                  placeholder="0.00"
                  onChange={e => setForm(f => ({ ...f, [priceField]: e.target.value }))}
                  className="w-28 px-2 py-1.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-400" />
                {form[priceField] && editCosto && (
                  <MarginBadge precio={parseFloat(form[priceField])} costo={editCosto} />
                )}
              </div>
            ))}
          </div>
        </div>

        {saveError && <p className="text-xs text-red-500">{saveError}</p>}
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{row.label}</p>
          {hasCostTiers ? (
            costTiers?.costo_1 != null ? (
              <p className="text-xs text-gray-400 leading-relaxed">
                {[
                  `<${costTiers.qty_tier2 ?? '∞'} pz → $${parseFloat(costTiers.costo_1).toFixed(0)}`,
                  costTiers.qty_tier2 && costTiers.costo_tier2 != null && `${costTiers.qty_tier2}+ → $${parseFloat(costTiers.costo_tier2).toFixed(0)}`,
                  costTiers.qty_tier3 && costTiers.costo_tier3 != null && `${costTiers.qty_tier3}+ → $${parseFloat(costTiers.costo_tier3).toFixed(0)}`,
                  costTiers.qty_tier4 && costTiers.costo_tier4 != null && `${costTiers.qty_tier4}+ → $${parseFloat(costTiers.costo_tier4).toFixed(0)}`,
                ].filter(Boolean).join(' · ')}
              </p>
            ) : (
              <p className="text-xs text-orange-400">Sin costos escalonados</p>
            )
          ) : (
            costo
              ? <p className="text-xs text-gray-400">Costo: ${costo.toFixed(2)}</p>
              : <p className="text-xs text-orange-400">Sin costo registrado</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-3">
          {productNames?.length > 0 && (
            <button onClick={() => setOpen(o => !o)}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
              {open ? 'Ocultar ▲' : `Ver (${productNames.length}) ▼`}
            </button>
          )}
          <button onClick={startEdit}
            className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors font-medium">
            Editar
          </button>
        </div>
      </div>

      {tiers.length > 0 ? (
        <>
          <p className="text-xs text-gray-400 font-medium mb-1.5">Precios de venta</p>
          <div className="flex flex-wrap gap-2">
            {tiers.map(({ price, label }, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl px-3 py-2 text-center min-w-[64px]">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-900">${parseFloat(price).toFixed(2)}</p>
                {costo && <div className="mt-1"><MarginBadge precio={price} costo={costo} /></div>}
                {costo && <p className="text-xs text-emerald-600 font-semibold mt-0.5">+${(parseFloat(price) - parseFloat(costo)).toFixed(2)}</p>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <button
          onClick={startEdit}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors">
          + Agregar costo y precios de venta
        </button>
      )}

      {open && productNames?.length > 0 && (
        <ul className="mt-3 space-y-0.5 border-t border-gray-100 pt-2 max-h-48 overflow-y-auto">
          {productNames.map((name, i) => (
            <li key={i} className="text-xs text-gray-500">• {name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── PerfumesSection ───────────────────────────────────────────────────────────
function PerfumesSection({ perfumeRows, headers, onSave, lvCostRule, onCostRuleSave, perfumeCostRule, onPerfumeCostRuleSave }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProducts(data.filter(p => p.categoria?.toLowerCase() === 'perfumes'))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const { lvNames, restNames } = useMemo(() => {
    const isLV = p => p.subcategoria === 'Louis Vuitton' || p.nombre.toLowerCase().includes('louis vuitton')
    return {
      lvNames: products.filter(isLV).map(p => p.nombre),
      restNames: products.filter(p => !isLV(p)).map(p => p.nombre),
    }
  }, [products])

  if (loading) {
    return (
      <div className="space-y-2 mt-3">
        {[1, 2].map(i => <div key={i} className="h-14 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
      </div>
    )
  }

  const perfumeRow = perfumeRows.find(r => r.label === 'Perfumes')
  const lvRow = perfumeRows.find(r => r.label === 'Louis Vuitton')

  return (
    <div className="mt-3 space-y-2">
      {perfumeRow && (
        <GroupPricingCard
          row={perfumeRow}
          productNames={restNames}
          headers={headers}
          onSave={onSave}
          hasCostTiers={true}
          costTiers={perfumeCostRule}
          onCostTiersSave={onPerfumeCostRuleSave}
          costMatchCampo="categoria"
          costMatchValor="Perfumes"
        />
      )}
      {lvRow && (
        <GroupPricingCard
          row={lvRow}
          productNames={lvNames}
          headers={headers}
          onSave={onSave}
          hasCostTiers={true}
          costTiers={lvCostRule}
          onCostTiersSave={onCostRuleSave}
        />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminLululemonPricing({ adminPassword }) {
  const [rows, setRows] = useState([])
  const [activeSubcats, setActiveSubcats] = useState({})
  const [costRules, setCostRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddAlo, setShowAddAlo] = useState(false)
  const [open, setOpen] = useState({ lululemon: true, alo: true, perfumes: true, gifts: true })
  const toggle = key => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

  const headers = { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }

  function reload() {
    setLoading(true)
    Promise.all([
      fetch('/api/admin/catalog-pricing', { headers }).then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/admin/costs', { headers }).then(r => r.json()),
    ]).then(([pricing, products, rules]) => {
      if (Array.isArray(pricing)) setRows(pricing)
      else setError(pricing.error || 'Error cargando precios')

      if (Array.isArray(rules)) setCostRules(rules)

      if (Array.isArray(products)) {
        // Build set of active subcategories per category from the real catalog
        const map = {}
        for (const p of products) {
          const cat = p.categoria
          if (!map[cat]) map[cat] = new Set()
          map[cat].add(p.subcategoria)
          // Flag flare leggings as a special subcategory
          if (cat === 'Lululemon' && p.subcategoria === 'Leggings' && p.nombre?.toLowerCase().includes('flare')) {
            map[cat].add('Flare Leggings')
          }
        }
        setActiveSubcats(map)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  function isActive(row) {
    const subcats = activeSubcats[row.categoria]
    if (!subcats) return false
    // Flare Leggings: active only if catalog has flare products
    if (row.label === 'Flare Leggings') return subcats.has('Flare Leggings')
    return subcats.has(row.label)
  }

  const lululemonRows = rows.filter(r => r.categoria === 'Lululemon' && isActive(r))
  const aloRows = rows.filter(r => r.categoria === 'Alo Yoga')
  const perfumeRows = rows.filter(r => r.categoria === 'Perfumes')
  const giftSetRow = rows.find(r => r.categoria === 'Gift Set de Perfumes')
  const lvCostRule = costRules.find(r => r.match_campo === 'subcategoria' && r.match_valor === 'Louis Vuitton') ?? null
  const perfumeCostRule = costRules.find(r => r.match_campo === 'categoria' && r.match_valor === 'Perfumes') ?? null

  function handleSave(updated) {
    setRows(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  function handleDelete(id) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function handleCostRuleSave(savedRule) {
    setCostRules(prev => {
      const exists = prev.some(r => r.id === savedRule.id)
      return exists ? prev.map(r => r.id === savedRule.id ? savedRule : r) : [...prev, savedRule]
    })
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
          Precios de venta y costos de compra. Los porcentajes son tu margen sobre costo.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* ── Lululemon ── */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <button onClick={() => toggle('lululemon')} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-700">Lululemon</h3>
            <span className="text-xs text-gray-400">MOQ 10 pz</span>
          </div>
          <span className="text-gray-400 text-xs">{open.lululemon ? '▲' : '▼'}</span>
        </button>
        {open.lululemon && (
          <div className="px-4 pb-4 pt-2 space-y-2 bg-gray-50">
            {loading ? skeleton : lululemonRows.map(row => (
              <BrandRow key={row.id} row={row} headers={headers} onSave={handleSave} onDelete={handleDelete} canDelete={false} />
            ))}
          </div>
        )}
      </div>

      {/* ── Alo Yoga ── */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <button onClick={() => toggle('alo')} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-700">Alo Yoga</h3>
            <span className="text-xs text-gray-400">MOQ 10 pz</span>
          </div>
          <div className="flex items-center gap-2">
            {!showAddAlo && open.alo && (
              <span onClick={e => { e.stopPropagation(); setShowAddAlo(true) }}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                + Agregar
              </span>
            )}
            <span className="text-gray-400 text-xs">{open.alo ? '▲' : '▼'}</span>
          </div>
        </button>
        {open.alo && (
          <div className="px-4 pb-4 pt-2 space-y-2 bg-gray-50">
            {loading ? skeleton : (
              <>
                {aloRows.map(row => (
                  <BrandRow key={row.id} row={row} headers={headers} onSave={handleSave} onDelete={handleDelete} canDelete={true} />
                ))}
                {aloRows.length === 0 && !showAddAlo && (
                  <p className="text-xs text-gray-400">Sin productos Alo todavía.</p>
                )}
                {showAddAlo && (
                  <AddBrandRowForm categoria="Alo Yoga" headers={headers} onAdd={handleAddAlo} onCancel={() => setShowAddAlo(false)} />
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Perfumes ── */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <button onClick={() => toggle('perfumes')} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
          <h3 className="text-sm font-bold text-gray-700">Perfumes</h3>
          <span className="text-gray-400 text-xs">{open.perfumes ? '▲' : '▼'}</span>
        </button>
        {open.perfumes && (
          <div className="px-4 pb-4 pt-2 bg-gray-50">
            {loading ? skeleton : (
              <PerfumesSection
                perfumeRows={perfumeRows}
                headers={headers}
                onSave={handleSave}
                lvCostRule={lvCostRule}
                onCostRuleSave={handleCostRuleSave}
                perfumeCostRule={perfumeCostRule}
                onPerfumeCostRuleSave={handleCostRuleSave}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Gift Sets ── */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <button onClick={() => toggle('gifts')} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
          <h3 className="text-sm font-bold text-gray-700">Gift Sets</h3>
          <span className="text-gray-400 text-xs">{open.gifts ? '▲' : '▼'}</span>
        </button>
        {open.gifts && (
          <div className="px-4 pb-4 pt-2 bg-gray-50">
            {loading
              ? <div className="h-14 bg-white rounded-2xl animate-pulse border border-gray-100" />
              : giftSetRow
                ? <GroupPricingCard row={giftSetRow} productNames={null} headers={headers} onSave={handleSave} />
                : <p className="text-xs text-gray-400">Sin datos.</p>}
          </div>
        )}
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
