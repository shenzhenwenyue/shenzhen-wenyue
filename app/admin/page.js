'use client'
import { useState, useEffect } from 'react'
import AdminOrderCard from '@/components/AdminOrderCard'
import AdminProductList from '@/components/AdminProductList'
import AdminReports from '@/components/AdminReports'
import AdminPersonalInventory from '@/components/AdminPersonalInventory'
import AdminLululemonPricing from '@/components/AdminLululemonPricing'
import AdminClients from '@/components/AdminClients'
import AdminStock from '@/components/AdminStock'
import AdminCosts from '@/components/AdminCosts'

const STATUS_ORDER = ['pending', 'confirmed', 'paid', 'shipped', 'completed']
const STATUS_LABELS = {
  pending: 'Pendientes',
  confirmed: 'Confirmados',
  paid: 'Pagados',
  shipped: 'Enviados',
  completed: 'Completados',
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')
  const [adminPassword, setAdminPassword] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  // Verificar si ya está autenticado en esta sesión
  useEffect(() => {
    const saved = sessionStorage.getItem('adminPassword')
    if (saved) {
      setAdminPassword(saved)
      setAuthenticated(true)
    }
  }, [])

  const [supplierStatus, setSupplierStatus] = useState({ joy: null, lucy: null })
  const [togglingSupplier, setTogglingSupplier] = useState(null)

  useEffect(() => {
    if (authenticated) {
      fetchOrders()
      fetch('/api/products').then(r => r.json()).then(data => { if (Array.isArray(data)) setProducts(data) }).catch(() => {})
      fetch('/api/catalog-status').then(r => r.json()).then(data => setCatalogLive(data.live !== false)).catch(() => {})
      // Fetch supplier status from admin endpoint (includes disabled products + sku field)
      fetch('/api/admin/products', { headers: { 'x-admin-password': adminPassword } })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const joyActive = data.some(p => p.sku?.toUpperCase().startsWith('S') && p.disponible)
            const lucyActive = data.some(p => p.sku?.toUpperCase().startsWith('XP') && p.disponible)
            setSupplierStatus({ joy: joyActive, lucy: lucyActive })
          }
        }).catch(() => {})
    }
  }, [authenticated])

  async function toggleSupplier(supplier) {
    if (togglingSupplier) return
    setTogglingSupplier(supplier)
    const prefix = supplier === 'joy' ? 'S' : 'XP'
    const newVal = !supplierStatus[supplier]
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({ sku_prefix: prefix, disponible: newVal }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSupplierStatus(prev => ({ ...prev, [supplier]: newVal }))
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setTogglingSupplier(null)
    }
  }

  async function toggleCatalog() {
    if (togglingCatalog) return
    setTogglingCatalog(true)
    const newValue = !catalogLive
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({ catalog_live: newValue }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      setCatalogLive(newValue)
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setTogglingCatalog(false)
    }
  }

  useEffect(() => {
    if (!authenticated) return
    const poll = setInterval(() => {
      if (!document.hidden) fetchOrders(true)
    }, 60000)
    function onVisibilityChange() {
      if (!document.hidden) fetchOrders(true)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [authenticated])

  async function handleLogin(e) {
    e.preventDefault()
    setAuthError(false)
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (data.ok) {
      sessionStorage.setItem('adminPassword', password)
      setAdminPassword(password)
      setAuthenticated(true)
    } else {
      setAuthError(true)
    }
  }

  async function fetchOrders(silent = false) {
    if (!silent) setLoading(true)
    const pwd = sessionStorage.getItem('adminPassword')
    const res = await fetch('/api/orders', {
      headers: { 'x-admin-password': pwd },
    })
    const data = await res.json()
    if (Array.isArray(data)) {
      setOrders(data)
      setLastUpdated(new Date())
    }
    if (!silent) setLoading(false)
  }

  function handleLogout() {
    sessionStorage.removeItem('adminPassword')
    setAuthenticated(false)
    setAdminPassword('')
    setOrders([])
  }

  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('cards')
  const [catalogLive, setCatalogLive] = useState(null)
  const [togglingCatalog, setTogglingCatalog] = useState(false)

  const byNewest = (a, b) => new Date(b.created_at) - new Date(a.created_at)
  const filtered = orders.filter(o => o.status === activeTab).sort(byNewest)
  const isProductTab = activeTab === 'products'
  const isReportsTab = activeTab === 'reports'
  const isCapitalTab = activeTab === 'capital'
  const isPricingTab = activeTab === 'pricing'
  const isClientsTab = activeTab === 'clients'
  const isStockTab = activeTab === 'stock'
  const isCostsTab = activeTab === 'costs'
  const isSpecialTab = isProductTab || isReportsTab || isCapitalTab || isPricingTab || isClientsTab || isStockTab || isCostsTab
  const pendingCount = orders.filter(o => o.status === 'pending').length

  function orderTotal(order) {
    return (order.items || []).reduce((sum, item) => {
      if (item.confirmed === false) return sum
      return sum + ((item.available_qty ?? item.qty) || 0) * (item.unit_price || 0)
    }, 0)
  }

  const confirmedTotal = orders
    .filter(o => o.status === 'confirmed')
    .reduce((sum, o) => sum + orderTotal(o), 0)

  const paidCount = orders.filter(o => o.status === 'paid').length

  const searchActive = search.trim().length > 0
  const searchResults = searchActive
    ? orders.filter(o => {
        const q = search.toLowerCase()
        return (
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_whatsapp?.toLowerCase().includes(q) ||
          o.id?.toLowerCase().includes(q)
        )
      }).sort(byNewest)
    : []

  const STATUS_COLORS = {
    pending:   'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    paid:      'bg-green-100 text-green-700',
    shipped:   'bg-purple-100 text-purple-700',
    completed: 'bg-gray-100 text-gray-500',
  }

  // ── Login ────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Panel de Administración</h1>
          <p className="text-sm text-gray-400 mb-6">Shenzhen Wenyue</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
            />
            {authError && <p className="text-xs text-red-500">Contraseña incorrecta</p>}
            <button
              type="submit"
              className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </main>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-black text-white px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold">Panel de Pedidos</h1>
          <p className="text-xs text-gray-400">Shenzhen Wenyue</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-xs text-gray-500">
                {Math.floor((Date.now() - lastUpdated) / 60000) === 0
                  ? 'ahora'
                  : `hace ${Math.floor((Date.now() - lastUpdated) / 60000)} min`}
              </span>
            </div>
          )}
          {catalogLive !== null && (
            <button
              onClick={toggleCatalog}
              disabled={togglingCatalog}
              title={catalogLive ? 'Catálogo público activo — clic para poner en mantenimiento' : 'Catálogo en mantenimiento — clic para activar'}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
                togglingCatalog
                  ? 'bg-gray-700 text-gray-400'
                  : catalogLive
                  ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
                  : 'bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${togglingCatalog ? 'bg-gray-400' : catalogLive ? 'bg-green-400' : 'bg-red-400'}`} />
              {togglingCatalog ? '...' : catalogLive ? 'Catálogo ON' : 'Catálogo OFF'}
            </button>
          )}
          <button
            onClick={() => fetchOrders()}
            className="text-xs text-gray-300 hover:text-white"
          >
            Actualizar
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-white"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Summary strip */}
      {orders.length > 0 && (
        <div className="bg-gray-900 text-white px-4 py-2 flex items-center gap-4 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span className="text-xs text-gray-300">
              <span className="font-bold text-white">{pendingCount}</span> pendiente{pendingCount !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-gray-700 text-xs shrink-0">·</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            <span className="text-xs text-gray-300">
              <span className="font-bold text-white">${confirmedTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> por cobrar
            </span>
          </div>
          <span className="text-gray-700 text-xs shrink-0">·</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            <span className="text-xs text-gray-300">
              <span className="font-bold text-white">{paidCount}</span> listo{paidCount !== 1 ? 's' : ''} para enviar
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto bg-white border-b border-gray-100 px-4">
        {STATUS_ORDER.map(status => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === status
                ? 'border-black text-black'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {STATUS_LABELS[status]}
            {status === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('products')}
          className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Productos
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'reports'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Reportes
        </button>
<button
          onClick={() => setActiveTab('capital')}
          className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'capital'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Productos de Bodega
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pricing'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Precios & Márgenes
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'stock'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Stock de Productos
        </button>
        <button
          onClick={() => setActiveTab('costs')}
          className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'costs'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Costos
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'clients'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Clientes
        </button>
        <a
          href="/admin/catalogo"
          className="shrink-0 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-amber-500 hover:text-amber-700 transition-colors"
        >
          Preview Catálogo
        </a>
      </div>

      {/* Search bar — only on order tabs */}
      {!isSpecialTab && (
        <div className="bg-white border-b border-gray-100 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o WhatsApp…"
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 bg-gray-50"
              />
              {searchActive && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm"
                >✕</button>
              )}
            </div>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'cards' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-xs font-medium transition-colors border-l border-gray-200 ${viewMode === 'table' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products tab */}
      {isProductTab && (
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
          {/* Supplier toggles */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proveedores</p>
            {[
              { key: 'joy', label: 'Joy', prefix: 'S' },
              { key: 'lucy', label: 'Lucy', prefix: 'XP' },
            ].map(({ key, label, prefix }) => {
              const active = supplierStatus[key]
              const loading = togglingSupplier === key
              return (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label} <span className="text-xs text-gray-400">(SKU {prefix}*)</span></p>
                    <p className="text-xs text-gray-400">{active === null ? 'Cargando...' : active ? 'Modelos visibles en catálogo' : 'Modelos ocultos del catálogo'}</p>
                  </div>
                  <button
                    onClick={() => toggleSupplier(key)}
                    disabled={loading || active === null}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${active ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              )
            })}
          </div>
          <AdminProductList />
        </div>
      )}

      {/* Reports tab */}
      {isReportsTab && (
        <div className="max-w-3xl mx-auto px-4 py-5">
          <AdminReports orders={orders} adminPassword={adminPassword} />
        </div>
      )}

{/* Mi Capital tab */}
      {isCapitalTab && (
        <div className="max-w-2xl mx-auto px-4 py-5">
          <AdminPersonalInventory adminPassword={adminPassword} />
        </div>
      )}

      {/* Precios Lululemon tab */}
      {isPricingTab && (
        <div className="max-w-2xl mx-auto px-4 py-5">
          <AdminLululemonPricing adminPassword={adminPassword} />
        </div>
      )}

      {/* Stock tab */}
      {isStockTab && (
        <div className="max-w-2xl mx-auto px-4 py-5">
          <AdminStock adminPassword={adminPassword} />
        </div>
      )}

      {/* Costs tab */}
      {isCostsTab && (
        <div className="max-w-2xl mx-auto px-4 py-5">
          <AdminCosts adminPassword={adminPassword} />
        </div>
      )}

      {/* Clients tab */}
      {isClientsTab && (
        <div className="max-w-2xl mx-auto px-4 py-5">
          <AdminClients orders={orders} />
        </div>
      )}

      {/* Orders */}
      {!isSpecialTab && (
        <div className={`max-w-2xl mx-auto px-4 py-5 ${viewMode === 'cards' ? 'space-y-4' : ''}`}>
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
              ))}
            </div>
          ) : (() => {
            const displayOrders = searchActive ? searchResults : filtered
            if (displayOrders.length === 0) {
              return (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-sm">{searchActive ? `Sin resultados para "${search}"` : 'No hay pedidos en esta sección'}</p>
                </div>
              )
            }
            if (viewMode === 'table') {
              return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {searchActive && <p className="text-xs text-gray-400 px-4 pt-3">{displayOrders.length} resultado{displayOrders.length !== 1 ? 's' : ''}</p>}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                          <th className="text-left px-4 py-2 font-medium">Cliente</th>
                          <th className="text-left px-4 py-2 font-medium">Productos</th>
                          <th className="text-right px-4 py-2 font-medium">Total</th>
                          {searchActive && <th className="text-left px-4 py-2 font-medium">Estado</th>}
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {displayOrders.map(order => {
                          const items = order.items || []
                          const preview = items.slice(0, 2).map(i => `${i.qty}× ${i.nombre}`).join(', ')
                          const extra = items.length > 2 ? ` +${items.length - 2} más` : ''
                          const fecha = new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                          return (
                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-gray-900 text-sm">{order.customer_name}</p>
                                <p className="text-xs text-gray-400">{fecha}</p>
                              </td>
                              <td className="px-4 py-3 max-w-[200px]">
                                <p className="text-xs text-gray-600 truncate">{preview}{extra}</p>
                                <p className="text-xs text-gray-400">{items.length} producto{items.length !== 1 ? 's' : ''}</p>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-bold text-gray-900">${(order.total || 0).toFixed(2)}</span>
                              </td>
                              {searchActive && (
                                <td className="px-4 py-3">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-500'}`}>
                                    {STATUS_LABELS[order.status] || order.status}
                                  </span>
                                </td>
                              )}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3 justify-end">
                                  <a
                                    href={`https://wa.me/${order.customer_whatsapp?.replace(/\D/g, '')}`}
                                    target="_blank" rel="noreferrer"
                                    className="text-green-500 hover:text-green-700"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                  </a>
                                  <button
                                    onClick={() => setViewMode('cards')}
                                    className="text-xs text-gray-400 hover:text-gray-700 font-medium"
                                  >
                                    Ver →
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
            // Cards view
            return (
              <>
                {searchActive && <p className="text-xs text-gray-400">{displayOrders.length} resultado{displayOrders.length !== 1 ? 's' : ''}</p>}
                {displayOrders.map(order => (
                  <div key={order.id}>
                    {searchActive && (
                      <div className="mb-1.5 px-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>
                    )}
                    <AdminOrderCard
                      order={order}
                      adminPassword={adminPassword}
                      onDelete={id => setOrders(prev => prev.filter(o => o.id !== id))}
                      products={products}
                    />
                  </div>
                ))}
              </>
            )
          })()}
        </div>
      )}
    </main>
  )
}
