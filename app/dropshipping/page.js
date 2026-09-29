'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import DropshipCard from '@/components/DropshipCard'
import { generarPedidoDropshippingPDF } from '@/lib/pdfDropship'

const CART_KEY = 'sw_ds_cart'

export default function DropshippingPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCat, setSelectedCat] = useState(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)

  // Cargar / guardar carrito (clave propia, aislada del catálogo normal)
  useEffect(() => {
    try { const s = localStorage.getItem(CART_KEY); if (s) setCart(JSON.parse(s)) } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch {}
  }, [cart])

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        if (Array.isArray(data)) setProducts(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Agrupar variantes por `grupo` (igual que el catálogo, para no duplicar tallas)
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
    return result
  }, [products])

  const categories = useMemo(() => [...new Set(products.map(p => p.categoria))].sort(), [products])

  const filtered = groupedProducts.filter(p => {
    const matchCat = !selectedCat || p.categoria === selectedCat
    const term = search.toLowerCase()
    const matchSearch = !search || (
      p.nombre.toLowerCase().includes(term) ||
      (p.categoria || '').toLowerCase().includes(term) ||
      (p.subcategoria || '').toLowerCase().includes(term) ||
      (p.isGroup && p.variants.some(v => v.nombre.toLowerCase().includes(term)))
    )
    return matchCat && matchSearch
  })

  const addToCart = useCallback((product, size = null) => {
    const cartId = size ? `${product.id}__${size}` : product.id
    // nombre limpio: si el nombre termina en " - {size}", lo quitamos (variantes agrupadas)
    let nombre = product.nombre || ''
    if (size && nombre.endsWith(` - ${size}`)) nombre = nombre.slice(0, -(` - ${size}`).length)
    setCart(prev => {
      const existing = prev.find(i => i.id === cartId)
      if (existing) return prev.map(i => i.id === cartId ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, {
        id: cartId, productId: product.id, size, qty: 1,
        nombre, sku: product.sku || '', imagen_url: product.imagen_url || null,
        categoria: product.categoria || '', subcategoria: product.subcategoria || '',
      }]
    })
  }, [])

  const removeFromCart = useCallback(cartId => {
    setCart(prev => {
      const ex = prev.find(i => i.id === cartId)
      if (!ex) return prev
      if (ex.qty <= 1) return prev.filter(i => i.id !== cartId)
      return prev.map(i => i.id === cartId ? { ...i, qty: i.qty - 1 } : i)
    })
  }, [])

  const setQtyInCart = useCallback((cartId, qty) => {
    setCart(prev => qty < 1 ? prev.filter(i => i.id !== cartId) : prev.map(i => i.id === cartId ? { ...i, qty } : i))
  }, [])

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-[#FF6A00] text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 shrink-0">
            <h1 className="font-bold tracking-tight leading-none text-base sm:text-lg truncate">Wholesale Catalog</h1>
            <p className="text-xs text-orange-100 mt-0.5">Build your order</p>
          </div>
          <div className="hidden sm:flex flex-1 min-w-0">
            <input
              type="text" placeholder="Search products, brands, categories..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-white rounded-l-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none"
            />
            <span className="bg-[#E55A00] px-5 py-2.5 rounded-r-xl flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
          </div>
          <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <span className="text-sm font-medium hidden sm:inline">My Order</span>
            {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-[#00A650] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{cartCount > 99 ? '99+' : cartCount}</span>}
          </button>
        </div>
      </header>

      {/* Aviso reseller */}
      <div className="bg-gray-900 py-1.5 text-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs">
          Select the models you want and download your order list (no prices — set your own).
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">
        {/* Buscador mobile */}
        <div className="flex sm:hidden mb-3">
          <input
            type="text" placeholder="Search products, brands..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-white border border-[#E8E8E8] rounded-l-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#FF6A00]"
          />
          <span className="bg-[#FF6A00] px-4 py-2.5 rounded-r-xl flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </span>
        </div>

        {/* Filtro categorías */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-3">
            <button
              onClick={() => setSelectedCat(null)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${!selectedCat ? 'bg-[#FF6A00] text-white border-[#FF6A00]' : 'bg-white text-gray-600 border-[#E8E8E8] hover:border-[#FF6A00] hover:text-[#FF6A00]'}`}
            >All</button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat === selectedCat ? null : cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${selectedCat === cat ? 'bg-[#FF6A00] text-white border-[#FF6A00]' : 'bg-white text-gray-600 border-[#E8E8E8] hover:border-[#FF6A00] hover:text-[#FF6A00]'}`}
              >{cat}</button>
            ))}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2"><div className="h-2.5 bg-gray-100 rounded w-1/2" /><div className="h-3.5 bg-gray-100 rounded" /><div className="h-8 bg-gray-100 rounded-xl mt-3" /></div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-12 text-center text-sm text-gray-500">Could not load the catalog. Please try again later.</div>
        )}

        {!loading && !error && (
          <>
            <p className="text-xs text-gray-500 mb-3 font-medium">{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</p>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map(product => (
                  <DropshipCard key={product.id} product={product} cart={cart} onAdd={addToCart} onRemove={removeFromCart} onSetQty={setQtyInCart} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">No products found</p>
                {(search || selectedCat) && <button onClick={() => { setSearch(''); setSelectedCat(null) }} className="mt-3 text-xs underline">Clear filters</button>}
              </div>
            )}
          </>
        )}
      </div>

      {cartOpen && (
        <DropCart
          cart={cart} onAdd={addToCart} onRemove={removeFromCart} onSetQty={setQtyInCart}
          onClose={() => setCartOpen(false)}
          onClearAll={() => setCart([])}
          onCheckout={() => { setCartOpen(false); setOrderOpen(true) }}
        />
      )}

      {orderOpen && (
        <DropOrderModal cart={cart} onClose={() => setOrderOpen(false)} />
      )}
    </main>
  )
}

// ── Drawer del pedido ──────────────────────────────────────────
function DropCart({ cart, onAdd, onRemove, onSetQty, onClose, onClearAll, onCheckout }) {
  const total = cart.reduce((s, i) => s + i.qty, 0)
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#FF6A00] text-white">
          <h2 className="font-bold">My Order · {total} pcs</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-16 text-sm">No products selected yet.</div>
          ) : cart.map(item => (
            <div key={item.id} className="flex items-center gap-3 border border-gray-100 rounded-xl p-2">
              <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                {item.imagen_url && <img src={item.imagen_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{item.nombre}{item.size ? ` · ${item.size}` : ''}</p>
                <p className="text-[10px] text-gray-400 uppercase">{item.categoria}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => onRemove(item.id)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700">−</button>
                <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                <button onClick={() => onAdd({ id: item.productId, nombre: item.nombre, sku: item.sku, imagen_url: item.imagen_url, categoria: item.categoria, subcategoria: item.subcategoria }, item.size)} className="w-8 h-8 rounded-lg bg-[#FF6A00] hover:bg-[#E55A00] flex items-center justify-center font-bold text-white">+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 p-4 space-y-2">
          {cart.length > 0 && (
            <button onClick={onClearAll} className="w-full text-xs text-red-400 hover:text-red-600 text-center">Clear all</button>
          )}
          <button
            onClick={onCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-[#FF6A00] text-white font-bold rounded-xl hover:bg-[#E55A00] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Download order (PDF)
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal final: datos opcionales + descarga PDF ───────────────
function DropOrderModal({ cart, onClose }) {
  const [resellerName, setResellerName] = useState('')
  const [note, setNote] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [done, setDone] = useState(false)

  const totalPcs = cart.reduce((s, i) => s + i.qty, 0)

  async function handleDownload() {
    setDownloading(true)
    try {
      const items = cart.map(i => ({ nombre: i.nombre, sku: i.sku, size: i.size, qty: i.qty, imagen_url: i.imagen_url }))
      const doc = await generarPedidoDropshippingPDF(items, { resellerName: resellerName.trim(), note: note.trim() })
      const stamp = new Date().toISOString().slice(0, 10)
      doc.save(`order-${stamp}.pdf`)
      setDone(true)
    } catch (e) {
      alert('Could not generate the PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <h2 className="font-bold text-lg text-gray-900">Download your order</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-semibold text-gray-900">Your PDF was downloaded</p>
            <p className="text-sm text-gray-500 mt-1">Check your downloads folder.</p>
            <button onClick={handleDownload} className="mt-4 text-sm text-[#FF6A00] font-medium underline">Download again</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{totalPcs} pcs selected. The PDF lists your models and quantities — no prices, so you can add your own.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Your name / business (optional)</label>
                <input value={resellerName} onChange={e => setResellerName(e.target.value)} placeholder="e.g. María's Boutique" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6A00]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Note (optional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Any note for this order..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6A00] resize-none" />
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading || totalPcs === 0}
              className="mt-5 w-full py-3 bg-[#FF6A00] text-white font-bold rounded-xl hover:bg-[#E55A00] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
