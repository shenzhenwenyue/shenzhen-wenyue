'use client'
import { useState, useEffect } from 'react'

export default function AdminProductList() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

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
      (p.sku || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function openEdit(product) {
    setEditingId(product.id)
    setUrlInput(product.imagen_url || '')
    setSaveError(null)
  }

  function closeEdit() {
    setEditingId(null)
    setUrlInput('')
    setSaveError(null)
  }

  async function handleSave(product, urlOverride) {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    const url = urlOverride !== undefined ? urlOverride : urlInput.trim()
    const pwd = sessionStorage.getItem('adminPassword')
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': pwd,
        },
        body: JSON.stringify({ imagen_url: url || null }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Error al guardar')
      setProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, imagen_url: url || null } : p)
      )
      closeEdit()
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

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

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {filtered.map(product => (
            <div key={product.id}>
              {/* Fila del producto */}
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                {/* Thumbnail */}
                <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {product.imagen_url ? (
                    <img
                      src={product.imagen_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {product.sku && (
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {product.sku}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{product.categoria}</span>
                    {!product.imagen_url && (
                      <span className="text-xs text-amber-500 font-medium">Sin foto</span>
                    )}
                  </div>
                </div>

                {/* Precio */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900">${product.precio_1.toFixed(2)}</p>
                </div>

                {/* Botón editar */}
                <button
                  onClick={() => editingId === product.id ? closeEdit() : openEdit(product)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    editingId === product.id
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {editingId === product.id ? 'Cancelar' : 'Foto'}
                </button>
              </div>

              {/* Panel inline de edición */}
              {editingId === product.id && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mt-3 mb-2">URL de la imagen</p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSave(product)}
                      disabled={saving}
                      className="shrink-0 px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>

                  {/* Preview */}
                  {urlInput && (
                    <div className="mt-3 flex items-start gap-3">
                      <img
                        src={urlInput}
                        alt="preview"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200 bg-gray-100"
                        onError={e => { e.target.src = ''; e.target.style.display = 'none' }}
                      />
                      <p className="text-xs text-gray-400 mt-1">Vista previa</p>
                    </div>
                  )}

                  {saveError && (
                    <p className="mt-2 text-xs text-red-500">{saveError}</p>
                  )}

                  <button
                    onClick={() => handleSave(product, '')}
                    disabled={saving || !product.imagen_url}
                    className="mt-3 text-xs text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                  >
                    Quitar imagen
                  </button>
                </div>
              )}
            </div>
          ))}
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
