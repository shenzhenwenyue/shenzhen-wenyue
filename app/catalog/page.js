'use client'
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import GroupedProductCard from '@/components/GroupedProductCard'
import CategoryFilter from '@/components/CategoryFilter'
import Cart from '@/components/Cart'
import OrderModal from '@/components/OrderModal'

function CatalogInner() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCat, setSelectedCat] = useState(() => searchParams.get('cat') || null)
  const [selectedSubcat, setSelectedSubcat] = useState(null)
  const [sortOrder, setSortOrder] = useState('destacado')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sw_cart')
      if (saved) setCart(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('sw_cart', JSON.stringify(cart))
    } catch {}
  }, [cart])

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

  const groupedProducts = useMemo(() => {
    const groupMap = {}
    const result = []
    products.forEach(p => {
      if (p.grupo) {
        if (!groupMap[p.grupo]) {
          groupMap[p.grupo] = { ...p, id: `grupo__${p.grupo}`, nombre: p.grupo, isGroup: true, variants: [] }
          result.push(groupMap[p.grupo])
        }
        groupMap[p.grupo].variants.push(p)
      } else {
        result.push({ ...p, isGroup: false })
      }
    })
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }, [products])

  const categories = [...new Set(products.map(p => p.categoria))].sort()

  const subcategories = selectedCat
    ? [...new Set(
        products
          .filter(p => p.categoria === selectedCat && p.subcategoria)
          .map(p => p.subcategoria)
      )].sort()
    : []

  function handleCatChange(cat) {
    setSelectedCat(cat)
    setSelectedSubcat(null)
  }

  const filtered = groupedProducts.filter(p => {
    const matchCat = !selectedCat || p.categoria === selectedCat
    const matchSubcat = !selectedSubcat || p.subcategoria === selectedSubcat
    const term = search.toLowerCase()
    const matchSearch = !search || (
      p.isGroup
        ? p.nombre.toLowerCase().includes(term) || p.variants.some(v => v.nombre.toLowerCase().includes(term))
        : p.nombre.toLowerCase().includes(term) ||
          p.categoria.toLowerCase().includes(term) ||
          (p.subcategoria || '').toLowerCase().includes(term) ||
          (p.descripcion || '').toLowerCase().includes(term)
    )
    return matchCat && matchSubcat && matchSearch
  })

  const sorted = sortOrder === 'destacado'
    ? [...filtered]
    : [...filtered].sort((a, b) =>
        sortOrder === 'az'
          ? a.nombre.localeCompare(b.nombre)
          : b.nombre.localeCompare(a.nombre)
      )

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

  function getCartSizes(productId) {
    return cart
      .filter(i => i.productId === productId && i.size)
      .reduce((acc, i) => ({ ...acc, [i.size]: i.qty }), {})
  }

  function getCategoryQty(categoria) {
    return cart
      .filter(i => {
        if (i.categoria) return i.categoria === categoria
        const p = products.find(p => p.id === i.productId)
        return p?.categoria === categoria
      })
      .reduce((sum, i) => sum + i.qty, 0)
  }

  function getSubcategoriaQty(categoria, subcategoria) {
    return cart
      .filter(i => {
        const p = products.find(p => p.id === i.productId)
        const cat = i.categoria || p?.categoria || ''
        return cat === categoria && (p?.subcategoria || '') === subcategoria
      })
      .reduce((sum, i) => sum + i.qty, 0)
  }

  const SUBCATEGORIA_PRICING = new Set(['Lululemon', 'Alo Yoga'])
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-[#FF6A00] text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="min-w-0 shrink-0 hover:opacity-90 transition-opacity">
            <h1 className="font-bold tracking-tight leading-none text-base sm:text-lg truncate">
              Shenzhen Wenyue LTD. Co.
            </h1>
            <p className="text-xs text-orange-100 mt-0.5">Wholesale · B2B</p>
          </a>

          {/* Search bar — hidden on mobile, visible on sm+ */}
          <div className="hidden sm:flex flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search products, brands, categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-white rounded-l-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none"
            />
            <button className="bg-[#E55A00] px-5 py-2.5 rounded-r-xl flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          <a
            href="/track"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl transition-colors text-sm font-medium shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="hidden sm:inline">My Orders</span>
          </a>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">Order</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#00A650] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Trust strip */}
      <div className="bg-gray-900 py-1.5 text-white">
        <div className="max-w-6xl mx-auto px-4 flex gap-6 justify-center text-xs flex-wrap">
          <span>&#10003; Verified Supplier</span>
          <span>&#10003; Secure Payment</span>
          <span>&#10003; USA Warehouse Stock</span>
          <span>&#10003; Prices in USD</span>
          <span>&#10003; +5 Years Experience</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">
        {/* Search bar — mobile only (desktop version is in the header) */}
        <div className="flex sm:hidden mb-3">
          <input
            type="text"
            placeholder="Search products, brands..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-white border border-[#E8E8E8] rounded-l-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#FF6A00]"
          />
          <button className="bg-[#FF6A00] px-4 py-2.5 rounded-r-xl flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selected={selectedCat}
            onChange={handleCatChange}
          />
        )}

        {selectedCat && subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            <button
              onClick={() => setSelectedSubcat(null)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                !selectedSubcat ? 'bg-[#FF6A00] text-white border-[#FF6A00]' : 'bg-white text-gray-600 border-[#E8E8E8] hover:border-[#FF6A00] hover:text-[#FF6A00]'
              }`}
            >
              All
            </button>
            {subcategories.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubcat(sub === selectedSubcat ? null : sub)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  selectedSubcat === sub ? 'bg-[#FF6A00] text-white border-[#FF6A00]' : 'bg-white text-gray-600 border-[#E8E8E8] hover:border-[#FF6A00] hover:text-[#FF6A00]'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        <FilterDropdown sortOrder={sortOrder} setSortOrder={setSortOrder} />

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden animate-pulse">
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

        {error && (
          <div className="mt-8 text-center py-12">
            <div className="text-red-400 text-sm font-medium mb-2">Could not load catalog</div>
            <p className="text-gray-400 text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="text-xs text-gray-500 mb-3 font-medium">
              {sorted.length} {sorted.length === 1 ? 'product' : 'products'}
            </p>
            {sorted.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-3">
                {sorted.map(product => (
                  product.isGroup ? (
                    <GroupedProductCard
                      key={product.id}
                      group={product}
                      cart={cart}
                      onAdd={addToCart}
                      onRemove={removeFromCart}
                      categoryQty={
                        SUBCATEGORIA_PRICING.has(product.categoria) && product.subcategoria
                          ? getSubcategoriaQty(product.categoria, product.subcategoria)
                          : getCategoryQty(product.categoria)
                      }
                    />
                  ) : (
                    <ProductCard
                      key={product.id}
                      product={product}
                      cartQty={cart.find(i => i.id === product.id)?.qty || 0}
                      cartSizes={getCartSizes(product.id)}
                      categoryQty={
                        SUBCATEGORIA_PRICING.has(product.categoria) && product.subcategoria
                          ? getSubcategoriaQty(product.categoria, product.subcategoria)
                          : getCategoryQty(product.categoria)
                      }
                      onAdd={addToCart}
                      onRemove={removeFromCart}
                      onSetQty={setQtyInCart}
                    />
                  )
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">No products found</p>
                {(search || selectedCat) && (
                  <button
                    onClick={() => { setSearch(''); setSelectedCat(null) }}
                    className="mt-3 text-xs underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {cartOpen && (
        <Cart
          items={cart}
          products={products}
          onAdd={addToCart}
          onRemove={removeFromCart}
          onClose={() => setCartOpen(false)}
          onRequestQuote={() => { setCartOpen(false); setQuoteOpen(true) }}
          onClearAll={() => setCart([])}
        />
      )}

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

export default function CatalogPage() {
  return (
    <Suspense>
      <CatalogInner />
    </Suspense>
  )
}

function FilterDropdown({ sortOrder, setSortOrder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const sortLabels = { destacado: 'Best Sellers', az: 'A–Z', za: 'Z–A' }
  const hasFilters = sortOrder !== 'destacado'

  return (
    <div className="relative pb-2" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
          hasFilters
            ? 'bg-[#FF6A00] text-white border-[#FF6A00]'
            : 'bg-white text-gray-600 border-[#E8E8E8] hover:border-[#FF6A00] hover:text-[#FF6A00]'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
        </svg>
        Sort
        {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 min-w-[220px] space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Sort by</p>
            <div className="flex flex-col gap-1">
              {Object.entries(sortLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setSortOrder(key) }}
                  className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    sortOrder === key ? 'bg-[#FF6A00] text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={() => { setSortOrder('destacado'); setOpen(false) }}
              className="w-full text-xs text-red-400 hover:text-red-600 text-center pt-1"
            >Clear filters</button>
          )}
        </div>
      )}
    </div>
  )
}
