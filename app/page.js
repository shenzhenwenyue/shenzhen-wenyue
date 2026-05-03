'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import ProductCard from '@/components/ProductCard'
import CategoryFilter from '@/components/CategoryFilter'
import Cart from '@/components/Cart'
import OrderModal from '@/components/OrderModal'

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCat, setSelectedCat] = useState(null)
  const [selectedSubcat, setSelectedSubcat] = useState(null)
  const [sortOrder, setSortOrder] = useState('destacado') // 'destacado' | 'az' | 'za'
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

  // Subcategorías de la categoría seleccionada
  const subcategories = selectedCat
    ? [...new Set(
        products
          .filter(p => p.categoria === selectedCat && p.subcategoria)
          .map(p => p.subcategoria)
      )].sort()
    : []

  // Reset subcategoría al cambiar categoría
  function handleCatChange(cat) {
    setSelectedCat(cat)
    setSelectedSubcat(null)
  }

  // Productos filtrados
  const filtered = products.filter(p => {
    const matchCat = !selectedCat || p.categoria === selectedCat
    const matchSubcat = !selectedSubcat || p.subcategoria === selectedSubcat
    const matchSearch =
      !search ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.categoria.toLowerCase().includes(search.toLowerCase()) ||
      p.subcategoria.toLowerCase().includes(search.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSubcat && matchSearch
  })

  // Ordenamiento
  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'az') return a.nombre.localeCompare(b.nombre)
    if (sortOrder === 'za') return b.nombre.localeCompare(a.nombre)
    // destacado: destacados primero, luego el resto
    if (a.destacado && !b.destacado) return -1
    if (!a.destacado && b.destacado) return 1
    return 0
  })

  // Acciones del carrito
  // cart item: { id, productId, size (null si no aplica), qty }
  const addToCart = useCallback((product, size = null) => {
    const cartId = size ? `${product.id}__${size}` : product.id
    setCart(prev => {
      const existing = prev.find(i => i.id === cartId)
      if (existing) return prev.map(i => i.id === cartId ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: cartId, productId: product.id, size, qty: 1, categoria: product.categoria }]
    })
  }, [])

  const removeFromCart = useCallback(cartId => {
    setCart(prev => {
      const existing = prev.find(i => i.id === cartId)
      if (!existing) return prev
      if (existing.qty <= 1) return prev.filter(i => i.id !== cartId)
      return prev.map(i => i.id === cartId ? { ...i, qty: i.qty - 1 } : i)
    })
  }, [])

  const setQtyInCart = useCallback((cartId, qty) => {
    setCart(prev => {
      if (qty < 1) return prev.filter(i => i.id !== cartId)
      return prev.map(i => i.id === cartId ? { ...i, qty } : i)
    })
  }, [])

  // cartSizes para un producto: { S: 2, M: 1 }
  function getCartSizes(productId) {
    return cart
      .filter(i => i.productId === productId && i.size)
      .reduce((acc, i) => ({ ...acc, [i.size]: i.qty }), {})
  }

  // qty total en carrito para Perfumes (mayoreo agrupado solo en esa categoría)
  function getCategoryQty(categoria) {
    if (categoria !== 'Perfumes') return 0
    return cart
      .filter(i => {
        // usar categoria guardada en el item primero, fallback a lookup por id
        if (i.categoria) return i.categoria === 'Perfumes'
        const p = products.find(p => p.id === i.productId)
        return p?.categoria === 'Perfumes'
      })
      .reduce((sum, i) => sum + i.qty, 0)
  }

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">Shenzhen Wenyue Ltd. Liability Co.</h1>
            <p className="text-xs text-gray-400 mt-0.5">Catálogo Mayoreo</p>
          </div>
          <a
            href="/track"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="hidden sm:inline">Mis pedidos</span>
          </a>
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
            onChange={handleCatChange}
          />
        )}

        {/* Filtro por marca — dropdown */}
        {subcategories.length > 0 && (
          <BrandDropdown
            subcategories={subcategories}
            selected={selectedSubcat}
            onChange={setSelectedSubcat}
          />
        )}

        {/* Sort */}
        <FilterDropdown
          subcategories={[]}
          selectedSubcat={selectedSubcat}
          setSelectedSubcat={setSelectedSubcat}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />

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
                    cartSizes={getCartSizes(product.id)}
                    categoryQty={getCategoryQty(product.categoria)}
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

function FilterDropdown({ subcategories, selectedSubcat, setSelectedSubcat, sortOrder, setSortOrder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const sortLabels = { destacado: 'Más vendidos', az: 'A–Z', za: 'Z–A' }
  const hasFilters = sortOrder !== 'destacado'

  return (
    <div className="relative pb-2" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
          hasFilters
            ? 'bg-black text-white border-black'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
        </svg>
        Ordenar
        {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 min-w-[220px] space-y-4">

          {/* Ordenar */}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Ordenar por</p>
            <div className="flex flex-col gap-1">
              {Object.entries(sortLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setSortOrder(key); }}
                  className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    sortOrder === key ? 'bg-black text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Subcategorías */}
          {subcategories.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Subcategoría</p>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => { setSelectedSubcat(null); }}
                  className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedSubcat === null ? 'bg-black text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >Todas</button>
                {subcategories.map(sub => (
                  <button
                    key={sub}
                    onClick={() => { setSelectedSubcat(sub === selectedSubcat ? null : sub); }}
                    className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedSubcat === sub ? 'bg-black text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >{sub}</button>
                ))}
              </div>
            </div>
          )}

          {/* Limpiar */}
          {hasFilters && (
            <button
              onClick={() => { setSelectedSubcat(null); setSortOrder('destacado'); setOpen(false) }}
              className="w-full text-xs text-red-400 hover:text-red-600 text-center pt-1"
            >Limpiar filtros</button>
          )}
        </div>
      )}
    </div>
  )
}

function BrandDropdown({ subcategories, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative pb-2" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
          selected
            ? 'bg-black text-white border-black'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h6" />
        </svg>
        {selected ? selected : 'Marca'}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 min-w-[160px]">
          <button
            onClick={() => { onChange(null); setOpen(false) }}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
              selected === null ? 'bg-black text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >Todas</button>
          {subcategories.map(sub => (
            <button
              key={sub}
              onClick={() => { onChange(selected === sub ? null : sub); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selected === sub ? 'bg-black text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >{sub}</button>
          ))}
        </div>
      )}
    </div>
  )
}
