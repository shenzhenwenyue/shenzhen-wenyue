/**
 * PDF de lista de pedido para DROPSHIPPING — módulo INDEPENDIENTE.
 * No comparte código con lib/pdf.js para no tocar nada del catálogo actual.
 * SIN precios: solo modelos + cantidades, para que el cliente le ponga sus propios precios.
 * Solo corre en el browser (jspdf usa APIs del navegador).
 */

async function loadImageAsDataURL(url) {
  if (!url) return null
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 4000)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      clearTimeout(timer)
      try {
        const SIZE = 60
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        canvas.getContext('2d').drawImage(img, 0, 0, SIZE, SIZE)
        resolve(canvas.toDataURL('image/jpeg', 0.6))
      } catch { resolve(null) }
    }
    img.onerror = () => { clearTimeout(timer); resolve(null) }
    img.src = url
  })
}

async function loadAllImages(items, imageMap) {
  await Promise.race([
    Promise.allSettled(
      items.filter(Boolean).map(async item => {
        if (item.imagen_url) {
          imageMap[item.imagen_url] = await loadImageAsDataURL(item.imagen_url)
        }
      })
    ),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ])
}

/**
 * items: [{ nombre, size, qty, imagen_url }]
 * meta:  { resellerName, note, date }
 * Devuelve el doc jsPDF (el caller llama doc.save(...)).
 */
export async function generarPedidoDropshippingPDF(items, meta = {}) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const rows = (items || []).filter(i => i && i.qty > 0)

  const imageMap = {}
  await loadAllImages(rows, imageMap)

  const fecha = (meta.date ? new Date(meta.date) : new Date()).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // ── Encabezado (white-label: marca = nombre del revendedor) ─
  const brand = (meta.resellerName && meta.resellerName.trim()) || 'Order List'
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(brand, 105, 22, { align: 'center' })
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('Product Selection List', 105, 30, { align: 'center' })
  doc.setDrawColor(200, 200, 200)
  doc.line(20, 35, 190, 35)

  // ── Datos ──────────────────────────────────────────────────
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  let y = 44
  doc.setFont('helvetica', 'normal')
  doc.text('Date: ' + fecha, 20, y); y += 7
  if (meta.note) {
    const noteLines = doc.splitTextToSize('Note: ' + meta.note, 170)
    doc.text(noteLines, 20, y)
    y += noteLines.length * 6
  }

  // ── Tabla (SIN precios) ────────────────────────────────────
  const IMG_SIZE = 14
  const ROW_HEIGHT = 18
  autoTable(doc, {
    startY: y + 4,
    head: [['', 'SKU', 'Product', 'Size', 'Qty.']],
    body: rows.map(r => ['', r.sku || '-', r.nombre, r.size || '-', String(r.qty)]),
    theme: 'striped',
    headStyles: { fillColor: [20, 20, 20], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, minCellHeight: ROW_HEIGHT },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 26 },
      2: { cellWidth: 86 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const r = rows[data.row.index]
        const imgData = r?.imagen_url && imageMap[r.imagen_url]
        if (imgData) {
          try { doc.addImage(imgData, 'JPEG', data.cell.x + 2, data.cell.y + 2, IMG_SIZE, IMG_SIZE) } catch {}
        }
      }
    },
  })

  const totalPiezas = rows.reduce((s, r) => s + r.qty, 0)
  const afterTable = doc.lastAutoTable.finalY + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('Total pieces: ' + totalPiezas + ' pcs', 20, afterTable)
  doc.text(rows.length + (rows.length === 1 ? ' model' : ' models'), 190, afterTable, { align: 'right' })

  // ── Footer ─────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200)
  doc.line(20, 282, 190, 282)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Product order list.', 105, 287, { align: 'center' })

  return doc
}
