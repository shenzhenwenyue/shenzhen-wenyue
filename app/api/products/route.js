import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SHEET_CSV_URL = process.env.SHEET_CSV_URL

/**
 * Parsea CSV respetando campos entre comillas que pueden contener comas.
 */
function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = splitCSVLine(lines[0])

  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = splitCSVLine(line)
      const obj = {}
      headers.forEach((header, i) => {
        obj[header.trim()] = (values[i] || '').trim()
      })
      return obj
    })
}

function splitCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)
  return values
}

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
  if (!SHEET_CSV_URL) {
    return NextResponse.json(
      { error: 'SHEET_CSV_URL no configurado. Agrega SHEET_CSV_URL a .env.local' },
      { status: 500 }
    )
  }

  try {
    const [sheetRes, pricingResult, inventoryResult] = await Promise.all([
      fetch(SHEET_CSV_URL, { next: { revalidate: 300 } }),
      getSupabase().from('catalog_pricing').select('*'),
      getSupabase().from('alo_inventory').select('*'),
    ])

    if (!sheetRes.ok) {
      throw new Error(
        `No se pudo leer el catálogo (status ${sheetRes.status}). Verifica que el Sheet esté publicado.`
      )
    }

    const text = await sheetRes.text()
    const rows = parseCSV(text)

    // Build lookup: { "Lululemon": [...rows], "Alo Yoga": [...rows], "Perfumes": [...rows], ... }
    const pricingByCategoria = {}
    for (const row of (pricingResult.data || [])) {
      if (!pricingByCategoria[row.categoria]) pricingByCategoria[row.categoria] = []
      pricingByCategoria[row.categoria].push(row)
    }

    // Build stock lookup for Alo Yoga: { "Alo Hat__S": 20, "Alo Hat__M": 30, ... }
    const aloStockByKey = {}
    for (const row of (inventoryResult.data || [])) {
      aloStockByKey[`${row.product_nombre}__${row.talla}`] = row.stock
    }

    const products = rows
      .filter(row => row.nombre && row.disponible?.toUpperCase() !== 'FALSE')
      .map((row, i) => {
        const stockRaw = row.stock?.trim() ?? ''
        const hasNumericStock = /^\d+$/.test(stockRaw)
        const nameParts = (row.nombre || '').trim().split(' - ')
        const lastSegment = nameParts[nameParts.length - 1]?.trim()
        const autoTalla = nameParts.length > 1 && /^(XS|S|M|L|XL|XXL|2XL|3XL|XXXL|XS\/S|M\/L)$/i.test(lastSegment)
          ? lastSegment.toUpperCase()
          : null
        const tallaVal = row.talla?.trim() || row.tallas?.trim() || autoTalla || null
        const grupoVal = row.grupo?.trim() ||
          (tallaVal ? (row.nombre || '').trim().replace(new RegExp(` - ${tallaVal}$`, 'i'), '').trim() : null)

        const product = {
          id: String(i + 1),
          nombre: row.nombre || '',
          categoria: (row.categoria === 'Gift Set de Pefumes' ? 'Gift Set de Perfumes' : row.categoria) || 'General',
          descripcion: row.descripcion || '',
          imagen_url: normalizeImageUrl(row.imagen_url),
          destacado: row.destacado?.toUpperCase() === 'TRUE',
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
          tallas: row.tallas ? row.tallas.split(',').map(t => t.trim()).filter(Boolean) : [],
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

        // Enriquecer productos Alo Yoga con stock por talla
        if (product.categoria === 'Alo Yoga') {
          const baseName = product.grupo || product.nombre
          if (product.tallas?.length > 0) {
            const tallaStock = {}
            for (const t of product.tallas) {
              const key = `${baseName}__${t}`
              if (key in aloStockByKey) tallaStock[t] = aloStockByKey[key]
            }
            if (Object.keys(tallaStock).length > 0) product.talla_stock = tallaStock
          } else {
            const t = product.talla || 'única'
            const key = `${baseName}__${t}`
            if (key in aloStockByKey) product.stock = aloStockByKey[key]
          }
        }

        return product
      })

    return NextResponse.json(products)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
