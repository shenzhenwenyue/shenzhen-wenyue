'use client'
import { useState, useEffect } from 'react'

const EMPTY_FORM = {
  nombre: '',
  match_campo: 'categoria',
  match_valor: '',
  match_categoria: '',
  match_subcategoria: '',
  fijo: false,
  costo_1: '',
  qty_tier2: '',
  costo_tier2: '',
  qty_tier3: '',
  costo_tier3: '',
  qty_tier4: '',
  costo_tier4: '',
}

export default function AdminCosts({ adminPassword }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const headers = { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }

  useEffect(() => { fetchRules() }, [])

  async function fetchRules() {
    setLoading(true)
    const res = await fetch('/api/admin/costs', { headers })
    const data = await res.json()
    if (Array.isArray(data)) setRules(data)
    setLoading(false)
  }

  function startEdit(rule) {
    setEditing(rule.id)
    const isCompound = rule.match_campo === 'subcategoria' && rule.match_valor.includes('|')
    const [cat, sub] = isCompound ? rule.match_valor.split('|') : ['', '']
    setForm({
      nombre: rule.nombre,
      match_campo: rule.match_campo,
      match_valor: isCompound ? '' : rule.match_valor,
      match_categoria: isCompound ? cat : '',
      match_subcategoria: isCompound ? sub : '',
      fijo: rule.fijo,
      costo_1: rule.costo_1 ?? '',
      qty_tier2: rule.qty_tier2 ?? '',
      costo_tier2: rule.costo_tier2 ?? '',
      qty_tier3: rule.qty_tier3 ?? '',
      costo_tier3: rule.costo_tier3 ?? '',
      qty_tier4: rule.qty_tier4 ?? '',
      costo_tier4: rule.costo_tier4 ?? '',
    })
    setError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    const isCompound = form.match_campo === 'categoria_subcategoria'
    const matchValorFinal = isCompound
      ? `${form.match_categoria}|${form.match_subcategoria}`
      : form.match_valor
    const matchCampoFinal = isCompound ? 'subcategoria' : form.match_campo
    if (!form.nombre || !matchValorFinal || matchValorFinal === '|' || !form.costo_1) {
      setError('Nombre, valor de coincidencia y costo base son requeridos.')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      nombre: form.nombre,
      match_campo: matchCampoFinal,
      match_valor: matchValorFinal,
      fijo: form.fijo,
      costo_1: parseFloat(form.costo_1),
      qty_tier2: form.qty_tier2 !== '' ? parseInt(form.qty_tier2) : null,
      costo_tier2: form.costo_tier2 !== '' ? parseFloat(form.costo_tier2) : null,
      qty_tier3: form.qty_tier3 !== '' ? parseInt(form.qty_tier3) : null,
      costo_tier3: form.costo_tier3 !== '' ? parseFloat(form.costo_tier3) : null,
      qty_tier4: form.qty_tier4 !== '' ? parseInt(form.qty_tier4) : null,
      costo_tier4: form.costo_tier4 !== '' ? parseFloat(form.costo_tier4) : null,
    }
    const method = editing ? 'PUT' : 'POST'
    const body = editing ? { id: editing, ...payload } : payload
    const res = await fetch('/api/admin/costs', { method, headers, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.error) { setError(data.error); setSaving(false); return }
    await fetchRules()
    cancelEdit()
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta regla de costo?')) return
    await fetch('/api/admin/costs', { method: 'DELETE', headers, body: JSON.stringify({ id }) })
    setRules(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Reglas de Costo</h2>
          <p className="text-xs text-gray-400 mt-0.5">Define el costo de proveedor por categoría o marca. Los reportes calculan la ganancia automáticamente.</p>
        </div>
        {!editing && (
          <button
            onClick={() => { setEditing('new'); setForm(EMPTY_FORM) }}
            className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            + Nueva regla
          </button>
        )}
      </div>

      {/* Formulario */}
      {editing && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <h3 className="font-semibold text-sm text-gray-900">{editing === 'new' ? 'Nueva regla' : 'Editar regla'}</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre de la regla</label>
              <input
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                placeholder="Ej: Perfumes general"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Aplicar por</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                value={form.match_campo}
                onChange={e => setForm(f => ({ ...f, match_campo: e.target.value }))}
              >
                <option value="categoria">Categoría</option>
                <option value="subcategoria">Subcategoría</option>
                <option value="categoria_subcategoria">Categoría + Subcategoría (específico)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              {form.match_campo === 'categoria_subcategoria' ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
                    <input
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                      placeholder="Ej: Lululemon"
                      value={form.match_categoria}
                      onChange={e => setForm(f => ({ ...f, match_categoria: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Subcategoría</label>
                    <input
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                      placeholder="Ej: Hoodies"
                      value={form.match_subcategoria}
                      onChange={e => setForm(f => ({ ...f, match_subcategoria: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Valor ({form.match_campo === 'categoria' ? 'nombre de categoría' : 'nombre de subcategoría'})
                  </label>
                  <input
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                    placeholder="Ej: Perfumes"
                    value={form.match_valor}
                    onChange={e => setForm(f => ({ ...f, match_valor: e.target.value }))}
                  />
                </>
              )}
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.fijo}
                  onChange={e => setForm(f => ({ ...f, fijo: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                Costo fijo (sin tiers)
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Costo base / tier 1 (por unidad)</label>
            <input
              type="number"
              step="0.01"
              className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
              placeholder="26.00"
              value={form.costo_1}
              onChange={e => setForm(f => ({ ...f, costo_1: e.target.value }))}
            />
          </div>

          {!form.fijo && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 font-medium">Tiers por volumen (dejar vacío si no aplica)</p>
              {[2, 3, 4].map(t => (
                <div key={t} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-12 shrink-0">Tier {t}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">desde</span>
                    <input
                      type="number"
                      className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                      placeholder="qty"
                      value={form[`qty_tier${t}`]}
                      onChange={e => setForm(f => ({ ...f, [`qty_tier${t}`]: e.target.value }))}
                    />
                    <span className="text-xs text-gray-400">u. →</span>
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                      placeholder="costo"
                      value={form[`costo_tier${t}`]}
                      onChange={e => setForm(f => ({ ...f, [`costo_tier${t}`]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-5 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de reglas */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
          Sin reglas definidas. Agrega la primera regla para activar el cálculo de ganancias.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {rules.map(rule => (
              <div key={rule.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{rule.nombre}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {rule.match_campo === 'subcategoria' && rule.match_valor.includes('|')
                        ? `Específico: ${rule.match_valor.replace('|', ' › ')}`
                        : rule.match_campo === 'subcategoria' ? `Subcategoría: ${rule.match_valor}`
                        : `Categoría: ${rule.match_valor}`}
                    </span>
                    {rule.fijo && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Fijo</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Base: ${rule.costo_1}
                    {!rule.fijo && rule.qty_tier2 && ` · ${rule.qty_tier2}u→$${rule.costo_tier2}`}
                    {!rule.fijo && rule.qty_tier3 && ` · ${rule.qty_tier3}u→$${rule.costo_tier3}`}
                    {!rule.fijo && rule.qty_tier4 && ` · ${rule.qty_tier4}u→$${rule.costo_tier4}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(rule)}
                    className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
