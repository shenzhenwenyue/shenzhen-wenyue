/**
 * Genera el PDF de confirmación de pedido.
 * Solo se llama desde el browser (jspdf usa APIs del navegador).
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

// selectedItems: array de items a incluir (si se omite, usa todos los confirmados)
export async function generarConfirmacionPDF(order, shippingCost = 0, selectedItems = null) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const confirmed = selectedItems ?? order.items.filter(i => i.confirmed !== false)
  const unavailable = order.items.filter(i => i.confirmed === false)

  const fecha = new Date(order.created_at).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const pedidoNum = order.id.substring(0, 8).toUpperCase()

  // ── Pre-cargar imágenes ─────────────────────────────────────
  const imageMap = {}
  await loadAllImages(confirmed, imageMap)

  // ── Encabezado ─────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('SHENZHEN WENYUE LTD. LIABILITY CO.', 105, 22, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('Order Confirmation', 105, 30, { align: 'center' })

  doc.setDrawColor(200, 200, 200)
  doc.line(20, 35, 190, 35)

  // ── Datos del pedido ────────────────────────────────────────
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Order #' + pedidoNum, 20, 44)
  doc.setFont('helvetica', 'normal')
  doc.text('Date: ' + fecha, 20, 51)
  doc.text('Customer: ' + order.customer_name, 20, 58)
  doc.text('WhatsApp: ' + order.customer_whatsapp, 20, 65)

  // ── Tabla productos confirmados ─────────────────────────────
  let startY = 76

  if (confirmed.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    doc.text('Confirmed Items', 20, startY)

    const IMG_COL = 18
    const IMG_SIZE = 14
    const ROW_HEIGHT = 18

    autoTable(doc, {
      startY: startY + 4,
      head: [['', 'Product', 'Qty.', 'Unit Price', 'Subtotal']],
      body: confirmed.map(item => {
        const qty = item.available_qty ?? item.qty
        return [
          '',
          item.nombre + (item.size ? ` (${item.size})` : ''),
          qty + ' pcs',
          '$' + item.unit_price.toFixed(2),
          '$' + (qty * item.unit_price).toFixed(2),
        ]
      }),
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, minCellHeight: ROW_HEIGHT },
      columnStyles: {
        0: { cellWidth: IMG_COL },
        1: { cellWidth: 72 },
        2: { cellWidth: 18 },
        3: { cellWidth: 26 },
        4: { cellWidth: 26 },
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const item = confirmed[data.row.index]
          const imgData = item.imagen_url && imageMap[item.imagen_url]
          if (imgData) {
            const pad = 2
            try {
              doc.addImage(
                imgData,
                data.cell.x + pad,
                data.cell.y + pad,
                IMG_SIZE,
                IMG_SIZE
              )
            } catch {}
          }
        }
      },
    })

    const subtotalProductos = confirmed.reduce((sum, item) => {
      return sum + (item.available_qty ?? item.qty) * item.unit_price
    }, 0)

    const afterTable = doc.lastAutoTable.finalY + 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text('Subtotal: $' + subtotalProductos.toFixed(2), 190, afterTable, { align: 'right' })

    if (shippingCost > 0) {
      doc.text('Shipping: $' + shippingCost.toFixed(2), 190, afterTable + 7, { align: 'right' })
    }

    const totalFinal = subtotalProductos + shippingCost
    const totalY = afterTable + (shippingCost > 0 ? 16 : 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('Total: $' + totalFinal.toFixed(2), 190, totalY, { align: 'right' })
    startY = totalY + 12
  }

  // ── Productos no disponibles ────────────────────────────────
  if (unavailable.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(180, 0, 0)
    doc.text('Unavailable Items:', 20, startY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    unavailable.forEach((item, i) => {
      doc.text('• ' + item.nombre, 25, startY + 7 + i * 6)
    })
    startY = startY + 10 + unavailable.length * 6
  }

  // ── Footer ──────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200)
  doc.line(20, 282, 190, 282)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    'This document confirms availability. The order is processed once payment is received.',
    105, 287, { align: 'center' }
  )

  return doc
}

// replacements: { [itemIndex]: [{ nombre, imagen_url, unit_price, qty }] }
export async function generarCotizacionPDF(order, replacements = {}, shippingCost = 0) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()

  // Construir filas: todos los items del pedido, con sugeridos debajo de cada uno
  const allRows = []
  order.items.forEach((item, idx) => {
    const sugs = (replacements[idx] || []).filter(r => r.nombre && r.qty > 0)
    const isOutOfStock = item.confirmed === false
    const qty = isOutOfStock ? 0 : (item.available_qty ?? item.qty)
    allRows.push({
      tipo: isOutOfStock ? 'outofstock' : 'normal',
      nombre: item.nombre + (item.size ? ` (${item.size})` : ''),
      qty,
      unit_price: item.unit_price,
      imagen_url: item.imagen_url,
    })
    sugs.forEach(sug => {
      allRows.push({
        tipo: 'replacement',
        nombre: sug.nombre,
        originalName: item.nombre + (item.size ? ` (${item.size})` : ''),
        qty: sug.qty,
        unit_price: sug.unit_price || 0,
        imagen_url: sug.imagen_url,
      })
    })
  })

  const fecha = new Date().toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const pedidoNum = order.id.substring(0, 8).toUpperCase()

  // ── Encabezado ─────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('SHENZHEN WENYUE LTD. LIABILITY CO.', 105, 22, { align: 'center' })
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('Order Quote', 105, 30, { align: 'center' })
  doc.setDrawColor(200, 200, 200)
  doc.line(20, 35, 190, 35)

  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Quote #' + pedidoNum, 20, 44)
  doc.setFont('helvetica', 'normal')
  doc.text('Date: ' + fecha, 20, 51)
  doc.text('Customer: ' + order.customer_name, 20, 58)
  doc.text('WhatsApp: ' + order.customer_whatsapp, 20, 65)

  let startY = 76

  // ── Tabla unificada ────────────────────────────────────────
  if (allRows.length > 0) {
    // Pre-cargar imágenes comprimidas (60×60 JPEG vía Canvas)
    const imageMap = {}
    await loadAllImages(allRows, imageMap)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    doc.text('Order Details', 20, startY)

    const IMG_SIZE = 14
    const ROW_HEIGHT = 18

    autoTable(doc, {
      startY: startY + 4,
      head: [['', 'Product', 'Qty.', 'Unit Price', 'Subtotal']],
      body: allRows.map(row => {
        if (row.tipo === 'outofstock') {
          return ['', row.nombre, 'Out of stock', '-', '-']
        }
        if (row.tipo === 'replacement') {
          return [
            '',
            '>> ' + row.nombre + ' [replaces: ' + row.originalName + ']',
            row.qty + ' pcs',
            '$' + row.unit_price.toFixed(2),
            '$' + (row.qty * row.unit_price).toFixed(2),
          ]
        }
        return [
          '',
          row.nombre,
          row.qty + ' pcs',
          '$' + row.unit_price.toFixed(2),
          '$' + (row.qty * row.unit_price).toFixed(2),
        ]
      }),
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, minCellHeight: ROW_HEIGHT },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 82 },
        2: { cellWidth: 18 },
        3: { cellWidth: 26 },
        4: { cellWidth: 26 },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const row = allRows[data.row.index]
          if (row?.tipo === 'replacement') {
            data.cell.styles.fillColor = [255, 251, 235]
            data.cell.styles.textColor = [146, 64, 14]
          } else if (row?.tipo === 'outofstock') {
            data.cell.styles.textColor = [160, 160, 160]
            data.cell.styles.fontStyle = 'italic'
            data.cell.styles.fillColor = [250, 250, 250]
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const row = allRows[data.row.index]
          if (!row) return
          const imgData = row.imagen_url && imageMap[row.imagen_url]
          if (imgData) {
            try { doc.addImage(imgData, 'JPEG', data.cell.x + 2, data.cell.y + 2, IMG_SIZE, IMG_SIZE) } catch {}
          }
        }
      },
    })

    const subtotal = allRows.filter(r => r.tipo !== 'outofstock').reduce((s, row) => s + row.qty * row.unit_price, 0)
    const afterTable = doc.lastAutoTable.finalY + 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text('Subtotal: $' + subtotal.toFixed(2), 190, afterTable, { align: 'right' })
    if (shippingCost > 0) {
      doc.text('Estimated shipping: $' + shippingCost.toFixed(2), 190, afterTable + 7, { align: 'right' })
    }
    const totalFinal = subtotal + shippingCost
    const totalY = afterTable + (shippingCost > 0 ? 16 : 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('Total: $' + totalFinal.toFixed(2), 190, totalY, { align: 'right' })
    startY = totalY + 16
  }

  // ── Footer ──────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200)
  doc.line(20, 279, 190, 279)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Payment methods: Cash App · Zelle · Alibaba Trade Assurance', 105, 284, { align: 'center' })
  doc.text('This quote is valid for 48 hours. Prices in USD.', 105, 289, { align: 'center' })

  return doc
}
