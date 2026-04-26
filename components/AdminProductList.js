'use client'
import { useState, useEffect } from 'react'

export default function AdminProductList() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState(null)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProducts(data) })
      .finally(() => setLoading(false))
  }, [])

  const categories = [...new Set(products.map(p => p.categoria))].sort()

  const filtered = products.filter(p => {
    const matchCat = !selectedCat || p.categoria === selectedCat
    const matchSearch = !search ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
        />
        <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCat(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium ${!selectedCat ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
        >
          Todos
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat === selectedCat ? null : cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${selectedCat === cat ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Contador */}
      <p className="text-xs text-gray-400">{filtered.length} productos activos</p>

      {/* Tabla */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-2">SKU</div>
            <div className="col-span-5">Producto</div>
            <div className="col-span-2">Categoría</div>
            <div className="col-span-3 text-right">Precio base</div>
          </div>
          <div className="divide-y divide-gray-50">
            {filtered.map(product => (
              <div key={product.id} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-gray-50">
                <div className="col-span-2">
                  {product.sku ? (
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-semibold">
                      {product.sku}
                    </span>
                  ) : (
                    <span className="text-xs text-red-400">Sin SKU</span>
                  )}
                </div>
                <div className="col-span-5">
                  <p className="text-sm font-medium text-gray-900 leading-snug">{product.nombre}</p>
                  {product.descripcion && (
                    <p className="text-xs text-gray-400 truncate">{product.descripcion}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-gray-500">{product.categoria}</span>
                </div>
                <div className="col-span-3 text-right">
                  <p className="text-sm font-semibold text-gray-900">${product.precio_1.toFixed(2)}</p>
                  {product.qty_tier2 && (
                    <p className="text-xs text-gray-400">{product.qty_tier2}+ u: ${product.precio_tier2?.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          No se encontraron productos
        </div>
      )}
    </div>
  )
}
