/**
 * Genera el PDF de confirmación de pedido.
 * Solo se llama desde el browser (jspdf usa APIs del navegador).
 */

async function loadImageAsDataURL(url) {
  if (!url) return null
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// selectedItems: array de items a incluir (si se omite, usa todos los confirmados)
export async function generarConfirmacionPDF(order, shippingCost = 0, selectedItems = null) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const confirmed = selectedItems ?? order.items.filter(i => i.confirmed !== false)
  const unavailable = order.items.filter(i => i.confirmed === false)

  const fecha = new Date(order.created_at).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const pedidoNum = order.id.substring(0, 8).toUpperCase()

  // ── Pre-cargar imágenes ─────────────────────────────────────
  const imageMap = {}
  await Promise.all(confirmed.map(async (item) => {
    if (item.imagen_url) {
      imageMap[item.imagen_url] = await loadImageAsDataURL(item.imagen_url)
    }
  }))

  // ── Encabezado ─────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('SHENZHEN WENYUE LTD. LIABILITY CO.', 105, 22, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('Confirmación de Pedido', 105, 30, { align: 'center' })

  doc.setDrawColor(200, 200, 200)
  doc.line(20, 35, 190, 35)

  // ── Datos del pedido ────────────────────────────────────────
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Pedido #' + pedidoNum, 20, 44)
  doc.setFont('helvetica', 'normal')
  doc.text('Fecha: ' + fecha, 20, 51)
  doc.text('Cliente: ' + order.customer_name, 20, 58)
  doc.text('WhatsApp: ' + order.customer_whatsapp, 20, 65)

  // ── Tabla productos confirmados ─────────────────────────────
  let startY = 76

  if (confirmed.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    doc.text('Productos Confirmados', 20, startY)

    const IMG_COL = 18
    const IMG_SIZE = 14
    const ROW_HEIGHT = 18

    autoTable(doc, {
      startY: startY + 4,
      head: [['', 'Producto', 'Cant.', 'Precio c/u', 'Subtotal']],
      body: confirmed.map(item => {
        const qty = item.available_qty || item.qty
        return [
          '',
          item.nombre + (item.size ? ` (${item.size})` : ''),
          qty + ' u.',
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
      return sum + (item.available_qty || item.qty) * item.unit_price
    }, 0)

    const afterTable = doc.lastAutoTable.finalY + 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text('Subtotal: $' + subtotalProductos.toFixed(2), 190, afterTable, { align: 'right' })

    if (shippingCost > 0) {
      doc.text('Envío: $' + shippingCost.toFixed(2), 190, afterTable + 7, { align: 'right' })
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
    doc.text('Productos No Disponibles:', 20, startY)
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
    'Este documento confirma disponibilidad. El pedido se procesa una vez recibido el pago.',
    105, 287, { align: 'center' }
  )

  return doc
}
