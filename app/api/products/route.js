import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

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

// Normalize for fuzzy label matching: lowercase, strip trailing 's' per word
function normalizeLabel(str) {
  return str.toLowerCase().trim().split(/\s+/).map(w => w.replace(/s$/, '')).join(' ')
}

function findPricingRow(rows, subcategoria) {
  const normSub = normalizeLabel(subcategoria)
  const words = normSub.split(' ').filter(Boolean)
  // 1. Exact normalized match
  let match = rows.find(r => normalizeLabel(r.label) === normSub)
  if (match) return match
  // 2. All words of subcategoria appear in label (handles "Cropped Jackets" → "Cropped Define Jacket")
  match = rows.find(r => {
    const normLabel = normalizeLabel(r.label)
    return words.every(w => normLabel.includes(w))
  })
  if (match) return match
  // 3. All words of label appear in subcategoria (handles shorter labels)
  match = rows.find(r => {
    const labelWords = normalizeLabel(r.label).split(' ').filter(Boolean)
    return labelWords.every(w => normSub.includes(w))
  })
  return match || null
}

export async function GET() {
  if (!SHEET_CSV_URL) {
    return NextResponse.json(
      { error: 'SHEET_CSV_URL no configurado. Agrega SHEET_CSV_URL a .env.local' },
      { status: 500 }
    )
  }

  try {
    const [sheetRes, pricingResult] = await Promise.all([
      fetch(SHEET_CSV_URL, { next: { revalidate: 300 } }),
      getSupabase().from('lululemon_pricing').select('*'),
    ])

    if (!sheetRes.ok) {
      throw new Error(
        `No se pudo leer el catálogo (status ${sheetRes.status}). Verifica que el Sheet esté publicado.`
      )
    }

    const text = await sheetRes.text()
    const rows = parseCSV(text)

    // Build lookup: { "Lululemon": [...rows], "Alo": [...rows] }
    const pricingByMarca = {}
    for (const row of (pricingResult.data || [])) {
      if (!pricingByMarca[row.marca]) pricingByMarca[row.marca] = []
      pricingByMarca[row.marca].push(row)
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
          categoria: row.categoria || 'General',
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
          qty_minima: parseInt(row.qty_minima) || 10,
          sku: row.sku || '',
          subcategoria: row.subcategoria || '',
          tallas: row.tallas ? row.tallas.split(',').map(t => t.trim()).filter(Boolean) : [],
          grupo: grupoVal,
          talla: tallaVal,
          stock: hasNumericStock ? parseInt(stockRaw) : null,
        }

        // Inject Supabase prices for Lululemon and Alo Yoga
        const marca = product.categoria === 'Lululemon' ? 'Lululemon'
          : product.categoria === 'Alo Yoga' ? 'Alo'
          : null
        if (marca && product.subcategoria) {
          const pricingRows = pricingByMarca[marca] || []
          const priceMatch = findPricingRow(pricingRows, product.subcategoria)
          if (priceMatch) {
            product.precio_1 = priceMatch.precio_10 || 0
            product.qty_tier2 = 25
            product.precio_tier2 = priceMatch.precio_25 || null
            product.qty_tier3 = 50
            product.precio_tier3 = priceMatch.precio_50 || null
            product.qty_tier4 = 100
            product.precio_tier4 = priceMatch.precio_100 || null
            product.qty_tier5 = null
            product.precio_tier5 = null
            product.qty_minima = 10
          }
        }

        return product
      })

    return NextResponse.json(products)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
