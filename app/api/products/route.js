import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Convierte links de Google Drive al formato thumbnail (más confiable para embeber).
 * Input:  https://drive.google.com/file/d/{ID}/view
 * Output: https://drive.google.com/thumbnail?id={ID}&sz=w600
 */
function normalizeImageUrl(url) {
  if (!url) return null
  const match = url.match(/drive\.google\.com\/file\/d\/([^/?\s]+)/)
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600`
  }
  return url
}

function findPricingRow(pricingByCategoria, categoria, subcategoria, nombre) {
  const rows = pricingByCategoria[categoria] || []
  if (!rows.length) return null

  // Product-level pricing: nombre_match takes priority over subcategoria
  const byNombre = rows.find(r => r.nombre_match && nombre.toLowerCase().includes(r.nombre_match.toLowerCase()))
  if (byNombre) return byNombre

  if (categoria === 'Perfumes') {
    if (subcategoria === 'Louis Vuitton') return rows.find(r => r.label === 'Louis Vuitton') || null
    return rows.find(r => r.label === 'Perfumes') || null
  }

  if (categoria === 'Gift Set de Perfumes') {
    return rows.find(r => r.label === 'Gift Set de Perfumes') || null
  }

  if (categoria === 'Lululemon' || categoria === 'Alo Yoga') {
    if (subcategoria === 'Leggings' && nombre.toLowerCase().includes('flare')) {
      return rows.find(r => r.label === 'Flare Leggings') || rows.find(r => r.label === subcategoria) || null
    }
    return rows.find(r => r.label === subcategoria) || null
  }

  return null
}

export async function GET() {
  try {
    const [productsResult, pricingResult, inventoryResult] = await Promise.all([
      getSupabase().from('products').select('*'),
      getSupabase().from('catalog_pricing').select('*'),
      getSupabase().from('inventory').select('nombre, stock, destacado'),
    ])

    if (productsResult.error) throw new Error(productsResult.error.message)

    // Build lookup: { "Lululemon": [...rows], "Alo Yoga": [...rows], "Perfumes": [...rows], ... }
    const pricingByCategoria = {}
    for (const row of (pricingResult.data || [])) {
      if (!pricingByCategoria[row.categoria]) pricingByCategoria[row.categoria] = []
      pricingByCategoria[row.categoria].push(row)
    }

    // Build inventory lookup: { "nombre del producto": { stock, destacado } }
    const inventoryByNombre = {}
    for (const row of (inventoryResult.data || [])) {
      inventoryByNombre[row.nombre] = row
    }

    const products = (productsResult.data || [])
      .filter(row => {
        if (!row.nombre) return false
        const d = row.disponible
        if (d === false) return false
        if (typeof d === 'string' && d.toUpperCase() === 'FALSE') return false
        return true
      })
      .map((row, i) => {
        const stockRaw = String(row.stock ?? '').trim()
        const hasNumericStock = /^\d+$/.test(stockRaw)
        const nameParts = (row.nombre || '').trim().split(' - ')
        const lastSegment = nameParts[nameParts.length - 1]?.trim()
        const autoTalla = nameParts.length > 1 && /^(XS|S|M|L|XL|XXL|2XL|3XL|XXXL|XS\/S|M\/L)$/i.test(lastSegment)
          ? lastSegment.toUpperCase()
          : null
        const tallaStr = row.talla ? String(row.talla).trim() : null
        const tallasStr = row.tallas ? String(row.tallas).trim() : null
        const tallaVal = tallaStr || tallasStr || autoTalla || null
        const grupoStr = row.grupo ? String(row.grupo).trim() : null
        const grupoVal = grupoStr ||
          (tallaVal ? (row.nombre || '').trim().replace(new RegExp(` - ${tallaVal}$`, 'i'), '').trim() : null)

        const product = {
          id: String(row.id || i + 1),
          nombre: row.nombre || '',
          categoria: (row.categoria === 'Gift Set de Pefumes' ? 'Gift Set de Perfumes' : row.categoria) || 'General',
          descripcion: row.descripcion || '',
          imagen_url: normalizeImageUrl(row.imagen_url),
          destacado: row.destacado === true || String(row.destacado ?? '').toUpperCase() === 'TRUE',
          precio_1: parseFloat(row.precio_1) || 0,
          qty_tier2: parseInt(row.qty_tier2) || null,
          precio_tier2: parseFloat(row.precio_tier2) || null,
          qty_tier3: parseInt(row.qty_tier3) || null,
          precio_tier3: parseFloat(row.precio_tier3) || null,
          qty_tier4: parseInt(row.qty_tier4) || null,
          precio_tier4: parseFloat(row.precio_tier4) || null,
          qty_tier5: parseInt(row.qty_tier5) || null,
          precio_tier5: parseFloat(row.precio_tier5) || null,
          qty_minima: parseInt(row.qty_minima) || 1,
          sku: row.sku || '',
          subcategoria: row.subcategoria || '',
          tallas: tallasStr ? tallasStr.split(',').map(t => t.trim()).filter(Boolean) : [],
          grupo: grupoVal,
          talla: tallaVal,
          stock: hasNumericStock ? parseInt(stockRaw) : null,
        }

        // Inject catalog_pricing for all managed categories (only when precio_1 is set)
        const priceRow = findPricingRow(pricingByCategoria, product.categoria, product.subcategoria, product.nombre)
        if (priceRow && priceRow.precio_1 != null) {
          product.precio_1 = priceRow.precio_1 || 0
          product.qty_minima = priceRow.qty_minima || 1
          product.qty_tier2 = priceRow.qty_tier2 || null
          product.precio_tier2 = priceRow.precio_tier2 || null
          product.qty_tier3 = priceRow.qty_tier3 || null
          product.precio_tier3 = priceRow.precio_tier3 || null
          product.qty_tier4 = priceRow.qty_tier4 || null
          product.precio_tier4 = priceRow.precio_tier4 || null
          product.qty_tier5 = null
          product.precio_tier5 = null
        }

        // Enriquecer con stock y destacado desde Supabase (todas las categorías)
        if (product.nombre in inventoryByNombre) {
          const inv = inventoryByNombre[product.nombre]
          product.stock = inv.stock ?? product.stock
          if (inv.destacado != null) product.destacado = inv.destacado
        }

        return product
      })

    return NextResponse.json(products)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
