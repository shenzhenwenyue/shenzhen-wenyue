'use client'
import { useState, useEffect, useRef } from 'react'

function getAdminPwd() {
  return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('adminPassword') : ''
}

export default function AdminProductList() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState(null)
  const [showDisabled, setShowDisabled] = useState(false)

  // Image edit state
  const [editingId, setEditingId] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const pasteZoneRef = useRef(null)

  // Category toggle state
  const [togglingCat, setTogglingCat] = useState(null)
  const [confirmCat, setConfirmCat] = useState(null) // { categoria, action: 'disable'|'enable' }

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const pwd = getAdminPwd()
    const res = await fetch('/api/admin/products', {
      headers: { 'x-admin-password': pwd },
    })
    const data = await res.json()
    if (Array.isArray(data)) setProducts(data)
    setLoading(false)
  }

  // Normalize disponible field (could be bool or string from import)
  function isEnabled(p) {
    if (p.disponible === false) return false
    if (typeof p.disponible === 'string' && p.disponible.toUpperCase() === 'FALSE') return false
    return true
  }

  const categories = [...new Set(products.map(p => p.categoria))].sort()

  // Per-category status: all disabled, some disabled, all enabled
  const catStatus = {}
  categories.forEach(cat => {
    const inCat = products.filter(p => p.categoria === cat)
    const enabledCount = inCat.filter(p => isEnabled(p)).length
    catStatus[cat] = enabledCount === 0 ? 'disabled' : enabledCount === inCat.length ? 'enabled' : 'partial'
  })

  const visibleProducts = showDisabled ? products : products.filter(p => isEnabled(p))

  const filtered = visibleProducts.filter(p => {
    const matchCat = !selectedCat || p.categoria === selectedCat
    const matchSearch = !search ||
      (p.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // ── Image editing ────────────────────────────────────────────

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

  async function handleSave(productId, urlOverride) {
    if (saving || uploading) return
    setSaving(true)
    setSaveError(null)
    const url = urlOverride !== undefined ? urlOverride : urlInput.trim()
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPwd(),
        },
        body: JSON.stringify({ imagen_url: url || null }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Error al guardar')
      setProducts(prev =>
        prev.map(p => p.id === productId ? { ...p, imagen_url: url || null } : p)
      )
      closeEdit()
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function uploadImageFile(file, productId) {
    if (!file?.type?.startsWith('image/')) return
    setUploading(true)
    setSaveError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: { 'x-admin-password': getAdminPwd() },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Error al subir imagen')
      setUrlInput(data.url)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setUploading(false)
    }
  }

  function handlePaste(e, productId) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) uploadImageFile(file, productId)
        return
      }
    }
  }

  // ── Category toggle ──────────────────────────────────────────

  async function toggleCategory(categoria, enable) {
    setTogglingCat(categoria)
    setConfirmCat(null)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPwd(),
        },
        body: JSON.stringify({ categoria, disponible: enable }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      setProducts(prev =>
        prev.map(p => p.categoria === categoria ? { ...p, disponible: enable } : p)
      )
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setTogglingCat(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────

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

      {/* Filtros de categoría con toggle de visibilidad */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCat(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium ${!selectedCat ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
        >
          Todos
        </button>
        {categories.map(cat => {
          const status = catStatus[cat]
          const isDisabled = status === 'disabled'
          const isPartial = status === 'partial'
          return (
            <div key={cat} className="flex items-center gap-0.5">
              <button
                onClick={() => setSelectedCat(cat === selectedCat ? null : cat)}
                className={`px-3 py-1 rounded-l-full text-xs font-medium transition-colors ${
                  selectedCat === cat
                    ? 'bg-black text-white'
                    : isDisabled
                    ? 'bg-red-50 border border-red-200 text-red-400 line-through'
                    : isPartial
                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {cat}
              </button>
              {/* Eye toggle */}
              <button
                onClick={() => setConfirmCat({ categoria: cat, action: isDisabled ? 'enable' : 'disable' })}
                disabled={togglingCat === cat}
                title={isDisabled ? 'Habilitar categoría' : 'Deshabilitar categoría'}
                className={`px-1.5 py-1 rounded-r-full border text-xs transition-colors ${
                  isDisabled
                    ? 'bg-red-50 border-red-200 text-red-400 hover:bg-red-100'
                    : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {togglingCat === cat ? (
                  <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : isDisabled ? (
                  // Eye-off icon
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  // Eye icon
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Toggle mostrar deshabilitados */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{filtered.length} productos</p>
        <button
          onClick={() => setShowDisabled(v => !v)}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${showDisabled ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white text-gray-400 border-gray-200'}`}
        >
          {showDisabled ? 'Ocultar deshabilitados' : 'Ver deshabilitados'}
        </button>
      </div>

      {/* Confirmación de toggle de categoría */}
      {confirmCat && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800">
            {confirmCat.action === 'disable'
              ? `¿Ocultar todos los productos de "${confirmCat.categoria}" del catálogo público?`
              : `¿Habilitar todos los productos de "${confirmCat.categoria}" en el catálogo público?`
            }
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => toggleCategory(confirmCat.categoria, confirmCat.action === 'enable')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${confirmCat.action === 'disable' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {confirmCat.action === 'disable' ? 'Deshabilitar' : 'Habilitar'}
            </button>
            <button
              onClick={() => setConfirmCat(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {filtered.map(product => {
            const enabled = isEnabled(product)
            return (
              <div key={product.id} className={enabled ? '' : 'opacity-50'}>
                {/* Fila */}
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
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {product.sku && (
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{product.sku}</span>
                      )}
                      <span className="text-xs text-gray-400">{product.categoria}</span>
                      {!product.imagen_url && enabled && (
                        <span className="text-xs text-amber-500 font-medium">Sin foto</span>
                      )}
                      {!enabled && (
                        <span className="text-xs text-red-400 font-medium">Deshabilitado</span>
                      )}
                    </div>
                  </div>

                  {/* Precio */}
                  <div className="shrink-0 text-right hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900">${(product.precio_1 || 0).toFixed(2)}</p>
                  </div>

                  {/* Botón editar foto */}
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

                {/* Panel inline de edición de imagen */}
                {editingId === product.id && (
                  <div
                    className="px-4 pb-4 bg-gray-50 border-t border-gray-100"
                    onPaste={e => handlePaste(e, product.id)}
                    ref={pasteZoneRef}
                  >
                    <p className="text-xs font-semibold text-gray-500 mt-3 mb-1">URL de la imagen</p>
                    <p className="text-xs text-gray-400 mb-2">
                      Pega una URL, o <strong>Ctrl+V</strong> con una imagen copiada para subirla directo
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        placeholder="https://... o pega imagen con Ctrl+V aquí"
                        className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSave(product.id)}
                        disabled={saving || uploading}
                        className="shrink-0 px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                      >
                        {saving ? 'Guardando...' : uploading ? 'Subiendo...' : 'Guardar'}
                      </button>
                    </div>

                    {/* Vista previa */}
                    {(urlInput || uploading) && (
                      <div className="mt-3 flex items-start gap-3">
                        {uploading ? (
                          <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center">
                            <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                          </div>
                        ) : (
                          <img
                            src={urlInput}
                            alt="preview"
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 bg-gray-100"
                            onError={e => { e.target.style.display = 'none' }}
                          />
                        )}
                        <p className="text-xs text-gray-400 mt-1">Vista previa</p>
                      </div>
                    )}

                    {saveError && (
                      <p className="mt-2 text-xs text-red-500">{saveError}</p>
                    )}

                    {product.imagen_url && (
                      <button
                        onClick={() => handleSave(product.id, '')}
                        disabled={saving || uploading}
                        className="mt-3 text-xs text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
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
