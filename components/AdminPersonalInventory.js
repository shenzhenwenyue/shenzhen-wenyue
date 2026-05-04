'use client'
import { useState, useEffect } from 'react'

const EMPTY_FORM = {
  nombre: '',
  categoria: '',
  qty: '',
  costo_unit: '',
  fecha_compra: new Date().toISOString().split('T')[0],
  notas: '',
}

export default function AdminPersonalInventory({ adminPassword }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const headers = { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const res = await fetch('/api/admin/personal-inventory', { headers })
    const data = await res.json()
    if (Array.isArray(data)) setItems(data)
    setLoading(false)
  }

  function startEdit(item) {
    setEditing(item.id)
    setForm({
      nombre: item.nombre,
      categoria: item.categoria ?? '',
      qty: item.qty,
      costo_unit: item.costo_unit,
      fecha_compra: item.fecha_compra ?? new Date().toISOString().split('T')[0],
      notas: item.notas ?? '',
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
    if (!form.nombre.trim() || !form.qty || !form.costo_unit) {
      setError('Nombre, cantidad y costo son requeridos.')
      return
    }
    setSaving(true)
    setError(null)
    const method = editing ? 'PUT' : 'POST'
    const body = editing
      ? { id: editing, ...form }
      : form
    const res = await fetch('/api/admin/personal-inventory', { method, headers, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.error) { setError(data.error); setSaving(false); return }
    await fetchItems()
    cancelEdit()
    setSaving(false)
  }

  async function togglePagado(item) {
    const res = await fetch('/api/admin/personal-inventory', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id: item.id, pagado: !item.pagado }),
    })
    const data = await res.json()
    if (!data.error) setItems(prev => prev.map(i => i.id === item.id ? data : i))
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este artículo?')) return
    await fetch('/api/admin/personal-inventory', { method: 'DELETE', headers, body: JSON.stringify({ id }) })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const pendientes = items.filter(i => !i.pagado)
  const pagados = items.filter(i => i.pagado)
  const totalPendiente = pendientes.reduce((sum, i) => sum + i.qty * i.costo_unit, 0)

  return (
    <div className="space-y-5">
      {/* Header + resumen */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-bold text-gray-900">Capital de Bodega</h2>
          <p className="text-xs text-gray-400 mt-0.5">Artículos financiados con tu capital personal. La ganancia se reparte normal — solo se registra el costo pendiente de reembolso.</p>
        </div>
        {!editing && (
          <button
            onClick={() => { setEditing('new'); setForm(EMPTY_FORM) }}
            className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shrink-0"
          >
            + Agregar artículo
          </button>
        )}
      </div>

      {/* Banner de deuda */}
      {totalPendiente > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-600 font-medium">Total que te deben</p>
            <p className="text-2xl font-bold text-amber-700">${totalPendiente.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-amber-500">{pendientes.length} {pendientes.length === 1 ? 'artículo' : 'artículos'} pendiente{pendientes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {totalPendiente === 0 && items.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
          <p className="text-sm font-semibold text-green-700">Todo pagado. Sin deuda pendiente.</p>
        </div>
      )}

      {/* Formulario */}
      {editing && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <h3 className="font-semibold text-sm text-gray-900">{editing === 'new' ? 'Nuevo artículo' : 'Editar artículo'}</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre del artículo</label>
              <input
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                placeholder="Ej: Perfume Armani Code"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoría (opcional)</label>
              <input
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                placeholder="Ej: Perfumes"
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cantidad</label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                placeholder="10"
                value={form.qty}
                onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Costo por unidad ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                placeholder="26.00"
                value={form.costo_unit}
                onChange={e => setForm(f => ({ ...f, costo_unit: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha de compra</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                value={form.fecha_compra}
                onChange={e => setForm(f => ({ ...f, fecha_compra: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notas (opcional)</label>
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
              placeholder="Ej: comprado antes del 15 de enero"
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            />
          </div>

          {form.qty && form.costo_unit && (
            <p className="text-xs text-gray-500">
              Total del lote: <span className="font-semibold text-gray-800">${(parseFloat(form.qty || 0) * parseFloat(form.costo_unit || 0)).toFixed(2)}</span>
            </p>
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

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
          Sin artículos registrados. Agrega los que financiaste con tu capital personal.
        </div>
      ) : (
        <>
          {/* Pendientes */}
          {pendientes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Pendiente de cobro</p>
              </div>
              <div className="divide-y divide-gray-50">
                {pendientes.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => togglePagado(item)}
                    onEdit={() => startEdit(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pagados */}
          {pagados.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-green-50 border-b border-green-100">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Ya pagados</p>
              </div>
              <div className="divide-y divide-gray-50">
                {pagados.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => togglePagado(item)}
                    onEdit={() => startEdit(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ItemRow({ item, onToggle, onEdit, onDelete }) {
  const total = item.qty * item.costo_unit
  return (
    <div className={`px-4 py-3 flex items-start justify-between gap-3 ${item.pagado ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3 min-w-0">
        <button
          onClick={onToggle}
          title={item.pagado ? 'Marcar como pendiente' : 'Marcar como pagado'}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            item.pagado
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-amber-400 hover:border-green-400'
          }`}
        >
          {item.pagado && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${item.pagado ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {item.nombre}
            </span>
            {item.categoria && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.categoria}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {item.qty} u. × ${parseFloat(item.costo_unit).toFixed(2)} = <span className="font-semibold text-gray-600">${total.toFixed(2)}</span>
            {item.fecha_compra && ` · ${new Date(item.fecha_compra + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </p>
          {item.notas && <p className="text-xs text-gray-400 italic mt-0.5">{item.notas}</p>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Editar
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}
