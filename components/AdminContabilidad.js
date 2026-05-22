'use client'
import { useState, useEffect, useMemo } from 'react'

const fmt = n => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const today = () => new Date().toISOString().split('T')[0]

const FUENTES = ['stock_propio', 'proveedor_lucy', 'proveedor_joy', 'otro']
const FUENTES_LABEL = { stock_propio: 'Stock propio', proveedor_lucy: 'Lucy', proveedor_joy: 'Joy', otro: 'Otro' }
const METODOS = ['Zelle', 'CashApp', 'Efectivo', 'Wire Transfer', 'Otro']
const CUENTAS = ['Shenzhen', 'Christian', 'Otro']
const PROVEEDORES = ['Lucy', 'Joy', 'Otro']

function Input({ label, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}
      <input
        {...props}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 bg-white"
      />
    </div>
  )
}

function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}
      <select
        {...props}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 bg-white text-gray-700"
      >
        {children}
      </select>
    </div>
  )
}

// ── Clientes ────────────────────────────────────────────────
function ClientesSection({ clients, ventas, pagos, clientBalances, headers, onRefresh }) {
  const [addOpen, setAddOpen] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', whatsapp: '', email: '', ciudad: '', notas: '' })

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setForm({ nombre: '', whatsapp: '', email: '', ciudad: '', notas: '' })
      setAddOpen(false)
      onRefresh()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, nombre) {
    if (!confirm(`¿Eliminar a ${nombre}? Se eliminarán sus ventas y pagos asociados.`)) return
    await fetch(`/api/admin/clients?id=${id}`, { method: 'DELETE', headers })
    onRefresh()
  }

  const filtered = clients.filter(c =>
    !search || c.nombre.toLowerCase().includes(search.toLowerCase()) || c.whatsapp?.includes(search)
  )

  const clientVentas = useMemo(() => {
    const map = {}
    for (const v of ventas) {
      if (!v.client_id) continue
      if (!map[v.client_id]) map[v.client_id] = []
      map[v.client_id].push(v)
    }
    return map
  }, [ventas])

  const ventasPagado = useMemo(() => {
    const map = {}
    for (const p of pagos) {
      if (!p.venta_id) continue
      map[p.venta_id] = (map[p.venta_id] || 0) + (p.monto || 0)
    }
    return map
  }, [pagos])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente…"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400"
        />
        <button
          onClick={() => setAddOpen(o => !o)}
          className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 shrink-0"
        >
          + Agregar
        </button>
      </div>

      {addOpen && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-900">Nuevo cliente</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre completo" required />
            <Input label="WhatsApp" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+1 800 000 0000" />
            <Input label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
            <Input label="Ciudad" value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} placeholder="Houston, TX" />
          </div>
          <Input label="Notas" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones…" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar cliente'}
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl border border-gray-200">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {filtered.map(c => {
          const bal = clientBalances[c.id] || { total_venta: 0, total_pagado: 0 }
          const balance = bal.total_venta - bal.total_pagado
          const isOpen = expanded === c.id
          const cVentas = clientVentas[c.id] || []

          return (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : c.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{c.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {c.whatsapp || 'Sin WhatsApp'}
                    {c.ciudad ? ` · ${c.ciudad}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3 space-y-0.5">
                  <p className="text-xs text-gray-400">Total: <span className="font-semibold text-gray-700">{fmt(bal.total_venta)}</span></p>
                  {balance > 0.01 ? (
                    <p className="text-xs font-bold text-red-600">Debe: {fmt(balance)}</p>
                  ) : (
                    <p className="text-xs font-semibold text-green-600">Al corriente</p>
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50">
                  {c.notas && <p className="text-xs text-gray-500 italic">{c.notas}</p>}

                  {cVentas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Ventas ({cVentas.length})</p>
                      <div className="space-y-1.5">
                        {cVentas.map(v => {
                          const pagado = ventasPagado[v.id] || 0
                          const pendiente = (v.total_venta || 0) - pagado
                          return (
                            <div key={v.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-gray-100">
                              <div>
                                <p className="text-xs font-medium text-gray-800">{v.descripcion || `${v.cantidad} unidades`}</p>
                                <p className="text-xs text-gray-400">{fmtDate(v.fecha)} · {FUENTES_LABEL[v.fuente] || v.fuente}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-gray-900">{fmt(v.total_venta)}</p>
                                {pendiente > 0.01
                                  ? <p className="text-xs text-red-500">Debe {fmt(pendiente)}</p>
                                  : <p className="text-xs text-green-600">Pagado</p>
                                }
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {c.whatsapp && (
                      <a
                        href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                        target="_blank" rel="noreferrer"
                        className="flex-1 py-2 bg-green-500 text-white text-xs font-semibold rounded-xl hover:bg-green-600 text-center"
                      >
                        WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(c.id, c.nombre)}
                      className="px-3 py-2 text-xs text-red-500 hover:text-red-700 border border-red-100 rounded-xl hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-center py-10 text-sm text-gray-400">
            {search ? 'Sin resultados' : 'No hay clientes aún'}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Ventas ──────────────────────────────────────────────────
function VentasSection({ ventas, clients, ventasPagado, headers, onRefresh }) {
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '', fecha: today(), descripcion: '', cantidad: '',
    total_venta: '', costo_productos: '', costo_envio: '', costo_empaque: '', costo_otros: '',
    fuente: 'stock_propio', notas: '',
  })

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/ventas', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cantidad: Number(form.cantidad) || 0,
          total_venta: Number(form.total_venta),
          costo_productos: Number(form.costo_productos) || 0,
          costo_envio: Number(form.costo_envio) || 0,
          costo_empaque: Number(form.costo_empaque) || 0,
          costo_otros: Number(form.costo_otros) || 0,
          client_id: form.client_id || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setForm({ client_id: '', fecha: today(), descripcion: '', cantidad: '', total_venta: '', costo_productos: '', costo_envio: '', costo_empaque: '', costo_otros: '', fuente: 'stock_propio', notas: '' })
      setAddOpen(false)
      onRefresh()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta venta?')) return
    await fetch(`/api/admin/ventas?id=${id}`, { method: 'DELETE', headers })
    onRefresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setAddOpen(o => !o)}
          className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800"
        >
          + Nueva venta
        </button>
      </div>

      {addOpen && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-900">Registrar venta</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Cliente" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">Sin asignar</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <Input label="Fecha" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            <div className="col-span-2">
              <Input label="Descripción" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: 12 perfumes diseñadores" />
            </div>
            <Input label="Cantidad" type="number" min="0" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} placeholder="0" />
            <Select label="Fuente" value={form.fuente} onChange={e => setForm(f => ({ ...f, fuente: e.target.value }))}>
              {FUENTES.map(f => <option key={f} value={f}>{FUENTES_LABEL[f]}</option>)}
            </Select>
            <Input label="Total venta ($) *" type="number" min="0" step="0.01" value={form.total_venta} onChange={e => setForm(f => ({ ...f, total_venta: e.target.value }))} placeholder="0.00" required />
            <div />
            <Input label="Costo productos ($)" type="number" min="0" step="0.01" value={form.costo_productos} onChange={e => setForm(f => ({ ...f, costo_productos: e.target.value }))} placeholder="0.00" />
            <Input label="Costo envío ($)" type="number" min="0" step="0.01" value={form.costo_envio} onChange={e => setForm(f => ({ ...f, costo_envio: e.target.value }))} placeholder="0.00" />
            <Input label="Empaque / Caja ($)" type="number" min="0" step="0.01" value={form.costo_empaque} onChange={e => setForm(f => ({ ...f, costo_empaque: e.target.value }))} placeholder="0.00" />
            <Input label="Otros gastos ($)" type="number" min="0" step="0.01" value={form.costo_otros} onChange={e => setForm(f => ({ ...f, costo_otros: e.target.value }))} placeholder="0.00" />
          </div>
          <Input label="Notas" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones…" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar venta'}
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {ventas.map(v => {
          const pagado = ventasPagado[v.id] || 0
          const pendiente = (v.total_venta || 0) - pagado
          const ganancia = (v.total_venta || 0) - (v.costo_total || 0)

          return (
            <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{v.clients?.nombre || 'Sin cliente'}</p>
                  <p className="text-xs text-gray-600">{v.descripcion || `${v.cantidad} unidades`}</p>
                  <p className="text-xs text-gray-400">{fmtDate(v.fecha)} · {FUENTES_LABEL[v.fuente] || v.fuente}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm font-bold text-gray-900">{fmt(v.total_venta)}</p>
                  {v.costo_total > 0 && <p className="text-xs text-green-600">Ganancia: {fmt(ganancia)}</p>}
                  {pendiente > 0.01
                    ? <p className="text-xs font-semibold text-red-500">Debe {fmt(pendiente)}</p>
                    : <p className="text-xs font-semibold text-green-600">Pagado</p>
                  }
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <button onClick={() => handleDelete(v.id)} className="text-xs text-red-400 hover:text-red-600">
                  Eliminar
                </button>
              </div>
            </div>
          )
        })}

        {ventas.length === 0 && (
          <p className="text-center py-10 text-sm text-gray-400">No hay ventas registradas</p>
        )}
      </div>
    </div>
  )
}

// ── Pagos ───────────────────────────────────────────────────
function PagosSection({ pagos, ventas, clients, headers, onRefresh }) {
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '', venta_id: '', monto: '', metodo: 'Zelle',
    cuenta: 'Shenzhen', referencia: '', fecha: today(), notas: '',
  })

  const ventasFiltered = useMemo(() => {
    if (!form.client_id) return ventas
    return ventas.filter(v => v.client_id === form.client_id)
  }, [ventas, form.client_id])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/pagos', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          monto: Number(form.monto),
          client_id: form.client_id || null,
          venta_id: form.venta_id || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setForm({ client_id: '', venta_id: '', monto: '', metodo: 'Zelle', cuenta: 'Shenzhen', referencia: '', fecha: today(), notas: '' })
      setAddOpen(false)
      onRefresh()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este pago?')) return
    await fetch(`/api/admin/pagos?id=${id}`, { method: 'DELETE', headers })
    onRefresh()
  }

  const METODO_COLORS = {
    Zelle: 'bg-purple-100 text-purple-700',
    CashApp: 'bg-green-100 text-green-700',
    Efectivo: 'bg-yellow-100 text-yellow-700',
    'Wire Transfer': 'bg-blue-100 text-blue-700',
    Otro: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{pagos.length} pago{pagos.length !== 1 ? 's' : ''} registrado{pagos.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setAddOpen(o => !o)}
          className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800"
        >
          + Registrar pago
        </button>
      </div>

      {addOpen && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-900">Registrar pago recibido</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Cliente" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value, venta_id: '' }))}>
              <option value="">Sin asignar</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <Select label="Venta asociada" value={form.venta_id} onChange={e => setForm(f => ({ ...f, venta_id: e.target.value }))}>
              <option value="">Sin asignar</option>
              {ventasFiltered.map(v => (
                <option key={v.id} value={v.id}>
                  {v.clients?.nombre || 'Sin cliente'} — {v.descripcion || `${v.cantidad}u`} ({fmt(v.total_venta)})
                </option>
              ))}
            </Select>
            <Input label="Monto ($) *" type="number" min="0.01" step="0.01" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0.00" required />
            <Input label="Fecha" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            <Select label="Método" value={form.metodo} onChange={e => setForm(f => ({ ...f, metodo: e.target.value }))}>
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Select label="Cuenta" value={form.cuenta} onChange={e => setForm(f => ({ ...f, cuenta: e.target.value }))}>
              {CUENTAS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <div className="col-span-2">
              <Input label="Referencia / Confirmación" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} placeholder="Número de confirmación…" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar pago'}
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {pagos.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${METODO_COLORS[p.metodo] || 'bg-gray-100 text-gray-600'}`}>
                  {p.metodo}
                </span>
                {p.cuenta && <span className="text-xs text-gray-400">{p.cuenta}</span>}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{p.clients?.nombre || 'Sin cliente'}</p>
              {p.ventas?.descripcion && <p className="text-xs text-gray-400 truncate">{p.ventas.descripcion}</p>}
              <p className="text-xs text-gray-400">{fmtDate(p.fecha)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-bold text-green-700">{fmt(p.monto)}</p>
              <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-600">
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {pagos.length === 0 && (
          <p className="text-center py-10 text-sm text-gray-400">No hay pagos registrados</p>
        )}
      </div>
    </div>
  )
}

// ── Proveedores ─────────────────────────────────────────────
function ProveedoresSection({ deudas, headers, onRefresh }) {
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editPagado, setEditPagado] = useState('')
  const [form, setForm] = useState({
    proveedor: 'Lucy', concepto: '', monto_total: '', monto_pagado: '',
    fecha: today(), fecha_vencimiento: '', notas: '',
  })

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/deudas-proveedor', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          monto_total: Number(form.monto_total),
          monto_pagado: Number(form.monto_pagado) || 0,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setForm({ proveedor: 'Lucy', concepto: '', monto_total: '', monto_pagado: '', fecha: today(), fecha_vencimiento: '', notas: '' })
      setAddOpen(false)
      onRefresh()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePago(deuda) {
    const nuevo = Number(editPagado)
    if (isNaN(nuevo) || nuevo < 0) return
    await fetch('/api/admin/deudas-proveedor', {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deuda.id, monto_total: deuda.monto_total, monto_pagado: nuevo }),
    })
    setEditId(null)
    onRefresh()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta deuda?')) return
    await fetch(`/api/admin/deudas-proveedor?id=${id}`, { method: 'DELETE', headers })
    onRefresh()
  }

  const ESTADO_COLORS = {
    pendiente: 'bg-red-100 text-red-700',
    parcial: 'bg-amber-100 text-amber-700',
    pagado: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setAddOpen(o => !o)}
          className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800"
        >
          + Nueva deuda
        </button>
      </div>

      {addOpen && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-900">Registrar deuda a proveedor</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Proveedor" value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))}>
              {PROVEEDORES.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Input label="Fecha" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            <div className="col-span-2">
              <Input label="Concepto" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} placeholder="Ej: Pedido 50 perfumes mayo" />
            </div>
            <Input label="Total deuda ($) *" type="number" min="0.01" step="0.01" value={form.monto_total} onChange={e => setForm(f => ({ ...f, monto_total: e.target.value }))} placeholder="0.00" required />
            <Input label="Ya pagado ($)" type="number" min="0" step="0.01" value={form.monto_pagado} onChange={e => setForm(f => ({ ...f, monto_pagado: e.target.value }))} placeholder="0.00" />
            <Input label="Vence" type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
            <Input label="Notas" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones…" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {deudas.map(d => {
          const pendiente = Math.max(0, (d.monto_total || 0) - (d.monto_pagado || 0))
          const isEditing = editId === d.id

          return (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-900">{d.proveedor}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLORS[d.estado] || 'bg-gray-100 text-gray-600'}`}>
                      {d.estado}
                    </span>
                  </div>
                  {d.concepto && <p className="text-xs text-gray-600">{d.concepto}</p>}
                  <p className="text-xs text-gray-400">
                    {fmtDate(d.fecha)}
                    {d.fecha_vencimiento ? ` · Vence ${fmtDate(d.fecha_vencimiento)}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{fmt(d.monto_total)}</p>
                  <p className="text-xs text-green-600">Pagado: {fmt(d.monto_pagado)}</p>
                  {pendiente > 0 && <p className="text-xs font-bold text-red-600">Pendiente: {fmt(pendiente)}</p>}
                </div>
              </div>

              {isEditing ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="number" min="0" step="0.01"
                    value={editPagado}
                    onChange={e => setEditPagado(e.target.value)}
                    placeholder="Monto pagado total"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none"
                  />
                  <button onClick={() => handlePago(d)} className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-xl">OK</button>
                  <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-xl">✕</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {d.estado !== 'pagado' && (
                    <button
                      onClick={() => { setEditId(d.id); setEditPagado(String(d.monto_pagado || '')) }}
                      className="flex-1 py-1.5 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50"
                    >
                      Actualizar pago
                    </button>
                  )}
                  <button onClick={() => handleDelete(d.id)} className="px-3 py-1.5 text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-xl hover:bg-red-50">
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {deudas.length === 0 && (
          <p className="text-center py-10 text-sm text-gray-400">No hay deudas a proveedores</p>
        )}
      </div>
    </div>
  )
}

// ── Cobros (me deben) ────────────────────────────────────────
function CobrosSection({ deudasCliente, clients, headers, onRefresh }) {
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editPagado, setEditPagado] = useState('')
  const [form, setForm] = useState({
    client_id: '', concepto: '', monto_total: '', monto_pagado: '',
    fecha: today(), notas: '',
  })

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/deudas-cliente', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          monto_total: Number(form.monto_total),
          monto_pagado: Number(form.monto_pagado) || 0,
          client_id: form.client_id || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setForm({ client_id: '', concepto: '', monto_total: '', monto_pagado: '', fecha: today(), notas: '' })
      setAddOpen(false)
      onRefresh()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePago(deuda) {
    const nuevo = Number(editPagado)
    if (isNaN(nuevo) || nuevo < 0) return
    await fetch('/api/admin/deudas-cliente', {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deuda.id, monto_total: deuda.monto_total, monto_pagado: nuevo }),
    })
    setEditId(null)
    onRefresh()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este cobro?')) return
    await fetch(`/api/admin/deudas-cliente?id=${id}`, { method: 'DELETE', headers })
    onRefresh()
  }

  const ESTADO_COLORS = {
    pendiente: 'bg-red-100 text-red-700',
    parcial: 'bg-amber-100 text-amber-700',
    pagado: 'bg-green-100 text-green-700',
  }

  const totalPendiente = deudasCliente.reduce(
    (s, d) => s + Math.max(0, (d.monto_total || 0) - (d.monto_pagado || 0)), 0
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {totalPendiente > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-1.5">
            <p className="text-xs text-red-600 font-medium">Pendiente por cobrar</p>
            <p className="text-base font-bold text-red-700">{fmt(totalPendiente)}</p>
          </div>
        )}
        <button
          onClick={() => setAddOpen(o => !o)}
          className="ml-auto px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800"
        >
          + Registrar cobro
        </button>
      </div>

      {addOpen && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-900">Me deben — nuevo registro</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Cliente" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">Sin asignar</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <Input label="Fecha" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            <div className="col-span-2">
              <Input label="Concepto" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} placeholder="Ej: Mercancía fiada, préstamo, saldo pendiente…" />
            </div>
            <Input label="Me deben ($) *" type="number" min="0.01" step="0.01" value={form.monto_total} onChange={e => setForm(f => ({ ...f, monto_total: e.target.value }))} placeholder="0.00" required />
            <Input label="Ya me pagaron ($)" type="number" min="0" step="0.01" value={form.monto_pagado} onChange={e => setForm(f => ({ ...f, monto_pagado: e.target.value }))} placeholder="0.00" />
            <div className="col-span-2">
              <Input label="Notas" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones…" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {deudasCliente.map(d => {
          const pendiente = Math.max(0, (d.monto_total || 0) - (d.monto_pagado || 0))
          const isEditing = editId === d.id

          return (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-900">{d.clients?.nombre || 'Sin cliente'}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLORS[d.estado] || 'bg-gray-100 text-gray-600'}`}>
                      {d.estado}
                    </span>
                  </div>
                  {d.concepto && <p className="text-xs text-gray-600">{d.concepto}</p>}
                  <p className="text-xs text-gray-400">{fmtDate(d.fecha)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{fmt(d.monto_total)}</p>
                  <p className="text-xs text-green-600">Pagado: {fmt(d.monto_pagado)}</p>
                  {pendiente > 0 && <p className="text-xs font-bold text-red-600">Pendiente: {fmt(pendiente)}</p>}
                </div>
              </div>

              {isEditing ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="number" min="0" step="0.01"
                    value={editPagado}
                    onChange={e => setEditPagado(e.target.value)}
                    placeholder="Total pagado hasta ahora"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none"
                  />
                  <button onClick={() => handlePago(d)} className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-xl">OK</button>
                  <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-xl">✕</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {d.estado !== 'pagado' && (
                    <button
                      onClick={() => { setEditId(d.id); setEditPagado(String(d.monto_pagado || '')) }}
                      className="flex-1 py-1.5 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50"
                    >
                      Registrar pago
                    </button>
                  )}
                  {d.clients?.whatsapp && (
                    <a
                      href={`https://wa.me/${d.clients.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${d.clients.nombre}, te recuerdo que tienes un saldo pendiente de ${fmt(Math.max(0, d.monto_total - d.monto_pagado))}.`)}`}
                      target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-xl hover:bg-green-600"
                    >
                      WA
                    </a>
                  )}
                  <button onClick={() => handleDelete(d.id)} className="px-3 py-1.5 text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-xl hover:bg-red-50">
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {deudasCliente.length === 0 && (
          <p className="text-center py-10 text-sm text-gray-400">No hay cobros pendientes registrados</p>
        )}
      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────
export default function AdminContabilidad({ adminPassword }) {
  const [section, setSection] = useState('clientes')
  const [clients, setClients] = useState([])
  const [ventas, setVentas] = useState([])
  const [pagos, setPagos] = useState([])
  const [deudas, setDeudas] = useState([])
  const [deudasCliente, setDeudasCliente] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const headers = useMemo(() => ({ 'x-admin-password': adminPassword }), [adminPassword])

  async function fetchAll() {
    setLoading(true)
    try {
      const [c, v, p, d, dc, s] = await Promise.all([
        fetch('/api/admin/clients', { headers }).then(r => r.json()),
        fetch('/api/admin/ventas', { headers }).then(r => r.json()),
        fetch('/api/admin/pagos', { headers }).then(r => r.json()),
        fetch('/api/admin/deudas-proveedor', { headers }).then(r => r.json()),
        fetch('/api/admin/deudas-cliente', { headers }).then(r => r.json()),
        fetch('/api/admin/contabilidad', { headers }).then(r => r.json()),
      ])
      if (Array.isArray(c)) setClients(c)
      if (Array.isArray(v)) setVentas(v)
      if (Array.isArray(p)) setPagos(p)
      if (Array.isArray(d)) setDeudas(d)
      if (Array.isArray(dc)) setDeudasCliente(dc)
      if (s && !s.error) setSummary(s)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (adminPassword) fetchAll() }, [adminPassword])

  const clientBalances = useMemo(() => {
    const map = {}
    for (const v of ventas) {
      if (!v.client_id) continue
      if (!map[v.client_id]) map[v.client_id] = { total_venta: 0, total_pagado: 0 }
      map[v.client_id].total_venta += v.total_venta || 0
    }
    for (const p of pagos) {
      if (!p.client_id) continue
      if (!map[p.client_id]) map[p.client_id] = { total_venta: 0, total_pagado: 0 }
      map[p.client_id].total_pagado += p.monto || 0
    }
    return map
  }, [ventas, pagos])

  const ventasPagado = useMemo(() => {
    const map = {}
    for (const p of pagos) {
      if (!p.venta_id) continue
      map[p.venta_id] = (map[p.venta_id] || 0) + (p.monto || 0)
    }
    return map
  }, [pagos])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      {summary && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
              <p className="text-xs text-green-600 font-medium">Cobrado</p>
              <p className="text-xl font-bold text-green-700">{fmt(summary.total_cobrado)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
              <p className="text-xs text-amber-600 font-medium">Por cobrar</p>
              <p className="text-xl font-bold text-amber-700">{fmt(summary.por_cobrar)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
              <p className="text-xs text-blue-600 font-medium">Ganancia bruta</p>
              <p className="text-xl font-bold text-blue-700">{fmt(summary.ganancia_bruta)}</p>
              <p className="text-xs text-blue-400">Ventas: {fmt(summary.total_ventas)}</p>
            </div>
            <div className={`border rounded-2xl p-3 ${summary.deuda_proveedores > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-xs font-medium ${summary.deuda_proveedores > 0 ? 'text-red-600' : 'text-gray-500'}`}>Deuda de Christian</p>
              <p className={`text-xl font-bold ${summary.deuda_proveedores > 0 ? 'text-red-700' : 'text-gray-400'}`}>{fmt(summary.deuda_proveedores)}</p>
            </div>
          </div>

          {/* Desglose de costos */}
          {summary.total_costos > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Desglose de costos</p>
              <div className="space-y-1">
                {summary.costo_productos > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Productos</span>
                    <span className="font-medium text-gray-800">{fmt(summary.costo_productos)}</span>
                  </div>
                )}
                {summary.costo_envio > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Envío</span>
                    <span className="font-medium text-gray-800">{fmt(summary.costo_envio)}</span>
                  </div>
                )}
                {summary.costo_empaque > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Empaque / Caja</span>
                    <span className="font-medium text-gray-800">{fmt(summary.costo_empaque)}</span>
                  </div>
                )}
                {summary.costo_otros > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Otros gastos</span>
                    <span className="font-medium text-gray-800">{fmt(summary.costo_otros)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
                  <span className="font-semibold text-gray-700">Total costos</span>
                  <span className="font-bold text-gray-900">{fmt(summary.total_costos)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'clientes', label: `Clientes${clients.length ? ` (${clients.length})` : ''}` },
          { key: 'ventas', label: `Ventas${ventas.length ? ` (${ventas.length})` : ''}` },
          { key: 'pagos', label: 'Pagos' },
          { key: 'cobros', label: `Deuda a Christian${deudasCliente.filter(d => d.estado !== 'pagado').length ? ` (${deudasCliente.filter(d => d.estado !== 'pagado').length})` : ''}` },
          { key: 'proveedores', label: 'Deuda de Christian' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              section === key ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'clientes' && (
        <ClientesSection
          clients={clients} ventas={ventas} pagos={pagos}
          clientBalances={clientBalances}
          headers={headers} onRefresh={fetchAll}
        />
      )}
      {section === 'ventas' && (
        <VentasSection
          ventas={ventas} clients={clients} ventasPagado={ventasPagado}
          headers={headers} onRefresh={fetchAll}
        />
      )}
      {section === 'pagos' && (
        <PagosSection
          pagos={pagos} ventas={ventas} clients={clients}
          headers={headers} onRefresh={fetchAll}
        />
      )}
      {section === 'cobros' && (
        <CobrosSection
          deudasCliente={deudasCliente} clients={clients}
          headers={headers} onRefresh={fetchAll}
        />
      )}
      {section === 'proveedores' && (
        <ProveedoresSection
          deudas={deudas} headers={headers} onRefresh={fetchAll}
        />
      )}
    </div>
  )
}
