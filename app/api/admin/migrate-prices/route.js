import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAuthorized(req) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function POST(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sheetUrl = process.env.SHEET_CSV_URL
  if (!sheetUrl) return NextResponse.json({ error: 'SHEET_CSV_URL no configurado' }, { status: 500 })

  // Fetch Sheet CSV
  const sheetRes = await fetch(sheetUrl, { cache: 'no-store' })
  if (!sheetRes.ok) return NextResponse.json({ error: 'No se pudo leer el Sheet' }, { status: 500 })

  const text = await sheetRes.text()
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

  function parseRow(line) {
    const values = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { values.push(current); current = '' }
      else { current += char }
    }
    values.push(current)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (values[i] || '').trim() })
    return obj
  }

  const rows = lines.slice(1).filter(l => l.trim()).map(parseRow)
    .filter(r => r.nombre && r.disponible?.toUpperCase() !== 'FALSE')

  function parseNum(v) { const n = parseFloat(v); return isNaN(n) ? null : n }
  function parseInt2(v) { const n = parseInt(v); return isNaN(n) ? null : n }

  // Find first non-LV perfume with prices
  const isLV = r => r.subcategoria === 'Louis Vuitton' || r.nombre?.toLowerCase().includes('louis vuitton')
  const perfumes = rows.filter(r => r.categoria?.toLowerCase() === 'perfumes')
  const perfumeRep = perfumes.find(r => !isLV(r) && parseNum(r.precio_1))
  const lvRep = perfumes.find(r => isLV(r) && parseNum(r.precio_1))
  const giftSetRep = rows.find(r => r.categoria === 'Gift Set de Perfumes' && parseNum(r.precio_1))

  const sb = getSupabase()
  const { data: pricingRows } = await sb.from('catalog_pricing').select('id, categoria, label')

  const updates = []

  async function applyRow(rep, categoria, label) {
    if (!rep) return { label, status: 'sin datos en Sheet' }
    const existing = pricingRows?.find(r => r.categoria === categoria && r.label === label)
    if (!existing) return { label, status: 'fila no encontrada en catalog_pricing' }
    const fields = {
      precio_1:     parseNum(rep.precio_1),
      qty_minima:   parseInt2(rep.qty_minima) || 1,
      qty_tier2:    parseInt2(rep.qty_tier2),
      precio_tier2: parseNum(rep.precio_tier2),
      qty_tier3:    parseInt2(rep.qty_tier3),
      precio_tier3: parseNum(rep.precio_tier3),
      qty_tier4:    parseInt2(rep.qty_tier4),
      precio_tier4: parseNum(rep.precio_tier4),
    }
    const { error } = await sb.from('catalog_pricing').update(fields).eq('id', existing.id)
    if (error) return { label, status: `error: ${error.message}` }
    return { label, status: 'ok', fields }
  }

  updates.push(await applyRow(perfumeRep,  'Perfumes',             'Perfumes'))
  updates.push(await applyRow(lvRep,        'Perfumes',             'Louis Vuitton'))
  updates.push(await applyRow(giftSetRep,   'Gift Set de Perfumes', 'Gift Set de Perfumes'))

  return NextResponse.json({ ok: true, updates })
}
