import { NextResponse } from 'next/server'

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

export async function GET() {
  if (!SHEET_CSV_URL) {
    return NextResponse.json(
      { error: 'SHEET_CSV_URL no configurado. Agrega SHEET_CSV_URL a .env.local' },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(SHEET_CSV_URL, {
      next: { revalidate: 300 }, // cache 5 minutos en el servidor
    })

    if (!res.ok) {
      throw new Error(
        `No se pudo leer el catálogo (status ${res.status}). Verifica que el Sheet esté publicado.`
      )
    }

    const text = await res.text()
    const rows = parseCSV(text)

    const products = rows
      .filter(row => row.nombre && row.disponible?.toUpperCase() !== 'FALSE')
      .map((row, i) => ({
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
        qty_minima: parseInt(row.qty_minima) || 1,
        sku: row.sku || '',
      }))

    return NextResponse.json(products)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
