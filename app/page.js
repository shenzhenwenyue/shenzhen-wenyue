'use client'
import { useState, useEffect, useCallback } from 'react'
import ProductCard from '@/components/ProductCard'
import CategoryFilter from '@/components/CategoryFilter'
import Cart from '@/components/Cart'
import OrderModal from '@/components/OrderModal'

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCat, setSelectedCat] = useState(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([]) // [{ id, qty }]
  const [cartOpen, setCartOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)

  // Cargar productos al montar
  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setProducts(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Categorías únicas, ordenadas
  const categories = [...new Set(products.map(p => p.categoria))].sort()

  // Productos filtrados
  const filtered = products.filter(p => {
    const matchCat = !selectedCat || p.categoria === selectedCat
    const matchSearch =
      !search ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.categoria.toLowerCase().includes(search.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // Destacados primero
  const sorted = [
    ...filtered.filter(p => p.destacado),
    ...filtered.filter(p => !p.destacado),
  ]

  // Acciones del carrito
  const addToCart = useCallback(product => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: product.id, qty: 1 }]
    })
  }, [])

  const removeFromCart = useCallback(productId => {
    setCart(prev => {
      const existing = prev.find(i => i.id === productId)
      if (!existing) return prev
      if (existing.qty <= 1) return prev.filter(i => i.id !== productId)
      return prev.map(i => i.id === productId ? { ...i, qty: i.qty - 1 } : i)
    })
  }, [])

  const setQtyInCart = useCallback((productId, qty) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === productId)
      if (qty < 1) return prev.filter(i => i.id !== productId)
      if (existing) return prev.map(i => i.id === productId ? { ...i, qty } : i)
      return [...prev, { id: productId, qty }]
    })
  }, [])

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">Shenzhen Wenyue</h1>
            <p className="text-xs text-gray-400 mt-0.5">Catálogo Mayoreo</p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-sm font-medium">Pedido</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5">
        {/* Buscador */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 transition-colors"
          />
          <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filtros por categoría */}
        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selected={selectedCat}
            onChange={setSelectedCat}
          />
        )}

        {/* Estado de carga */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  <div className="h-3.5 bg-gray-100 rounded" />
                  <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                  <div className="h-8 bg-gray-100 rounded-xl mt-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 text-center py-12">
            <div className="text-red-400 text-sm font-medium mb-2">No se pudo cargar el catálogo</div>
            <p className="text-gray-400 text-xs">{error}</p>
          </div>
        )}

        {/* Grid de productos */}
        {!loading && !error && (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {sorted.length} {sorted.length === 1 ? 'producto' : 'productos'}
            </p>
            {sorted.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sorted.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    cartQty={cart.find(i => i.id === product.id)?.qty || 0}
                    onAdd={addToCart}
                    onRemove={removeFromCart}
                    onSetQty={setQtyInCart}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">No se encontraron productos</p>
                {(search || selectedCat) && (
                  <button
                    onClick={() => { setSearch(''); setSelectedCat(null) }}
                    className="mt-3 text-xs underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Carrito */}
      {cartOpen && (
        <Cart
          items={cart}
          products={products}
          onAdd={addToCart}
          onRemove={removeFromCart}
          onClose={() => setCartOpen(false)}
          onRequestQuote={() => { setCartOpen(false); setQuoteOpen(true) }}
        />
      )}

      {/* Modal de cotización */}
      {quoteOpen && (
        <OrderModal
          items={cart}
          products={products}
          onClose={() => setQuoteOpen(false)}
          onSuccess={() => { setQuoteOpen(false); setCart([]) }}
        />
      )}
    </main>
  )
}
