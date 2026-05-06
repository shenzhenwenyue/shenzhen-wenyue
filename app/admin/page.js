'use client'
import { useState, useEffect } from 'react'
import AdminOrderCard from '@/components/AdminOrderCard'
import AdminProductList from '@/components/AdminProductList'
import AdminReports from '@/components/AdminReports'
import AdminPersonalInventory from '@/components/AdminPersonalInventory'
import AdminLululemonPricing from '@/components/AdminLululemonPricing'
import AdminClients from '@/components/AdminClients'
import AdminStock from '@/components/AdminStock'

const STATUS_ORDER = ['pending', 'confirmed', 'paid', 'shipped', 'completed']
const STATUS_LABELS = {
  pending: 'Pendientes',
  confirmed: 'Confirmados',
  paid: 'Pagados',
  shipped: 'Enviados',
  completed: 'Archivados',
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [orders, setOrders] = useState([])
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

  useEffect(() => {
    if (authenticated) fetchOrders()
  }, [authenticated])

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

  const byNewest = (a, b) => new Date(b.created_at) - new Date(a.created_at)
  const filtered = orders.filter(o => o.status === activeTab).sort(byNewest)
  const isProductTab = activeTab === 'products'
  const isReportsTab = activeTab === 'reports'
const isCapitalTab = activeTab === 'capital'
  const isPricingTab = activeTab === 'pricing'
  const isClientsTab = activeTab === 'clients'
  const isStockTab = activeTab === 'stock'
  const isSpecialTab = isProductTab || isReportsTab || isCapitalTab || isPricingTab || isClientsTab || isStockTab
  const pendingCount = orders.filter(o => o.status === 'pending').length

  function orderTotal(order) {
    return (order.items || []).reduce((sum, item) => {
      if (item.confirmed === false) return sum
      return sum + (item.available_qty || item.qty || 0) * (item.unit_price || 0)
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
          Stock de Bodega
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
          Stock
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
      </div>

      {/* Search bar — only on order tabs */}
      {!isSpecialTab && (
        <div className="bg-white border-b border-gray-100 px-4 py-2">
          <div className="max-w-2xl mx-auto relative">
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
        </div>
      )}

      {/* Products tab */}
      {isProductTab && (
        <div className="max-w-2xl mx-auto px-4 py-5">
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

      {/* Clients tab */}
      {isClientsTab && (
        <div className="max-w-2xl mx-auto px-4 py-5">
          <AdminClients orders={orders} />
        </div>
      )}

      {/* Orders */}
      {!isSpecialTab && (
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
              ))}
            </div>
          ) : searchActive ? (
            searchResults.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">Sin resultados para "{search}"</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400">{searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}</p>
                {searchResults.map(order => (
                  <div key={order.id}>
                    <div className="mb-1.5 px-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <AdminOrderCard
                      order={order}
                      adminPassword={adminPassword}
                      onDelete={id => setOrders(prev => prev.filter(o => o.id !== id))}
                    />
                  </div>
                ))}
              </>
            )
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No hay pedidos en esta sección</p>
            </div>
          ) : (
            filtered.map(order => (
              <AdminOrderCard
                key={order.id}
                order={order}
                adminPassword={adminPassword}
                onDelete={id => setOrders(prev => prev.filter(o => o.id !== id))}
              />
            ))
          )}
        </div>
      )}
    </main>
  )
}
