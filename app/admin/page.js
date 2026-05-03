'use client'
import { useState, useEffect } from 'react'
import AdminOrderCard from '@/components/AdminOrderCard'
import AdminProductList from '@/components/AdminProductList'
import AdminReports from '@/components/AdminReports'
import AdminCosts from '@/components/AdminCosts'

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

  async function fetchOrders() {
    setLoading(true)
    const pwd = sessionStorage.getItem('adminPassword')
    const res = await fetch('/api/orders', {
      headers: { 'x-admin-password': pwd },
    })
    const data = await res.json()
    if (Array.isArray(data)) setOrders(data)
    setLoading(false)
  }

  function handleLogout() {
    sessionStorage.removeItem('adminPassword')
    setAuthenticated(false)
    setAdminPassword('')
    setOrders([])
  }

  const filtered = orders.filter(o => o.status === activeTab)
  const isProductTab = activeTab === 'products'
  const isReportsTab = activeTab === 'reports'
  const isCostsTab = activeTab === 'costs'
  const pendingCount = orders.filter(o => o.status === 'pending').length

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
          <button
            onClick={fetchOrders}
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
          onClick={() => setActiveTab('costs')}
          className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'costs'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Costos
        </button>
      </div>

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

      {/* Costs tab */}
      {isCostsTab && (
        <div className="max-w-2xl mx-auto px-4 py-5">
          <AdminCosts adminPassword={adminPassword} />
        </div>
      )}

      {/* Orders */}
      {!isProductTab && !isReportsTab && !isCostsTab && <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
            ))}
          </div>
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
      </div>}
    </main>
  )
}
