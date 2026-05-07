'use client'
import { useState, useMemo, useEffect } from 'react'
import { getCosto } from '@/lib/pricing'
const PERIOD_OPTIONS = [
  { label: 'Hoy', value: 'today' },
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mes', value: 'month' },
  { label: 'Todo', value: 'all' },
]

const REVENUE_STATUSES = ['paid', 'shipped', 'completed']

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  shipped: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  paid: 'Pagado',
  shipped: 'Enviado',
  completed: 'Completado',
}

export default function AdminReports({ orders, adminPassword }) {
  const [period, setPeriod] = useState('month')
  const [capitalItems, setCapitalItems] = useState([])
  const [catalogPricing, setCatalogPricing] = useState([])
  const [costRules, setCostRules] = useState([])

  useEffect(() => {
    if (!adminPassword) return
    const headers = { 'x-admin-password': adminPassword }
    fetch('/api/admin/personal-inventory', { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCapitalItems(data) })
    fetch('/api/admin/catalog-pricing', { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCatalogPricing(data) })
    fetch('/api/admin/costs', { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCostRules(data) })
  }, [adminPassword])

  const filteredOrders = useMemo(() => {
    const now = new Date()
    return orders.filter(o => {
      const date = new Date(o.created_at)
      if (period === 'today') return date.toDateString() === now.toDateString()
      if (period === 'week') {
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return date >= weekAgo
      }
      if (period === 'month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }
      return true
    })
  }, [orders, period])

  const kpis = useMemo(() => {
    const revenueOrders = filteredOrders.filter(o => REVENUE_STATUSES.includes(o.status))
    const totalOrders = filteredOrders.length
    const paidOrders = revenueOrders.length
    const totalUnits = revenueOrders.reduce((sum, o) =>
      sum + (o.items || []).filter(i => i.confirmed !== false).reduce((s, i) => s + (i.available_qty || i.qty), 0), 0)
    const pendingRevenue = filteredOrders
      .filter(o => o.status === 'pending' || o.status === 'confirmed')
      .reduce((sum, o) => sum + (o.items || []).filter(i => i.confirmed !== false).reduce((s, i) => s + (i.available_qty || i.qty) * (i.unit_price || 0), 0), 0)

    let totalCosto = 0
    let itemsConCosto = 0
    let totalItemsRevenue = 0
    revenueOrders.forEach(o => {
      const confirmedItems = (o.items || []).filter(i => i.confirmed !== false)
      const categoryQtyMap = {}
      confirmedItems.forEach(item => {
        const cat = item.categoria
        if (cat) categoryQtyMap[cat] = (categoryQtyMap[cat] || 0) + (item.available_qty || item.qty)
      })
      confirmedItems.forEach(item => {
        const qty = item.available_qty || item.qty
        const revenue = qty * (item.unit_price || 0)
        const totalCategoryQty = item.categoria ? (categoryQtyMap[item.categoria] ?? qty) : qty
        const costo = item.unit_cost ?? getCosto(costRules, item, totalCategoryQty)
        totalItemsRevenue += revenue
        if (costo !== null) {
          totalCosto += parseFloat(costo) * qty
          itemsConCosto++
        }
      })
    })
    const totalShippingRevenue = revenueOrders.reduce((sum, o) => sum + (o.shipping_cost || 0), 0)
    const totalRevenue = totalItemsRevenue + totalShippingRevenue
    const avgTicket = paidOrders > 0 ? totalRevenue / paidOrders : 0
    const totalCostoEnvioReal = revenueOrders.reduce((sum, o) => sum + (o.costo_envio_real || 0), 0)
    const ganancia = totalRevenue - totalCosto - totalCostoEnvioReal
    const margen = totalRevenue > 0 ? (ganancia / totalRevenue) * 100 : null

    return { totalRevenue, totalOrders, paidOrders, avgTicket, totalUnits, pendingRevenue, ganancia, margen, tieneCostos: itemsConCosto > 0 }
  }, [filteredOrders, costRules])

  const categoryBreakdown = useMemo(() => {
    const map = {}
    filteredOrders
      .filter(o => REVENUE_STATUSES.includes(o.status))
      .forEach(o => {
        const confirmedItems = (o.items || []).filter(i => i.confirmed !== false)
        const categoryQtyMap = {}
        confirmedItems.forEach(item => {
          const cat = item.categoria
          if (cat) categoryQtyMap[cat] = (categoryQtyMap[cat] || 0) + (item.available_qty || item.qty)
        })
        confirmedItems.forEach(item => {
          const cat = item.categoria || 'Sin categoría'
          if (!map[cat]) map[cat] = { qty: 0, revenue: 0, costo: 0, tieneCosto: false }
          const qty = item.available_qty || item.qty
          const revenue = qty * (item.unit_price || 0)
          const totalCategoryQty = item.categoria ? (categoryQtyMap[item.categoria] ?? qty) : qty
          const costo = item.unit_cost ?? getCosto(costRules, item, totalCategoryQty)
          map[cat].qty += qty
          map[cat].revenue += revenue
          if (costo !== null) {
            map[cat].costo += parseFloat(costo) * qty
            map[cat].tieneCosto = true
          }
        })
      })
    return Object.entries(map)
      .map(([cat, data]) => [cat, { ...data, ganancia: data.tieneCosto ? data.revenue - data.costo : null }])
      .sort((a, b) => b[1].revenue - a[1].revenue)
  }, [filteredOrders, costRules])

  const topProducts = useMemo(() => {
    const map = {}
    filteredOrders
      .filter(o => REVENUE_STATUSES.includes(o.status))
      .forEach(o => {
        ;(o.items || []).forEach(item => {
          if (item.confirmed === false) return
          const key = item.nombre
          if (!map[key]) map[key] = { qty: 0, revenue: 0, categoria: item.categoria }
          const qty = item.available_qty || item.qty
          map[key].qty += qty
          map[key].revenue += qty * (item.unit_price || 0)
        })
      })
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10)
  }, [filteredOrders])

  function exportCSV() {
    const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || period
    const rows = [
      ['ID Pedido', 'Fecha', 'Cliente', 'WhatsApp', 'Status', 'Producto', 'Categoría', 'Talla', 'Qty Pedida', 'Qty Disponible', 'Precio Unitario', 'Subtotal Línea', 'Total Pedido'],
    ]

    filteredOrders.forEach(o => {
      const fecha = new Date(o.created_at).toLocaleDateString('es-MX')
      const items = o.items || []
      if (items.length === 0) {
        rows.push([
          o.id.substring(0, 8).toUpperCase(), fecha, o.customer_name, o.customer_whatsapp,
          STATUS_LABELS[o.status] || o.status,
          '', '', '', '', '', '', '', (o.total || 0).toFixed(2),
        ])
      } else {
        items.forEach((item, idx) => {
          const qty = item.available_qty || item.qty
          rows.push([
            o.id.substring(0, 8).toUpperCase(),
            fecha,
            idx === 0 ? o.customer_name : '',
            idx === 0 ? o.customer_whatsapp : '',
            idx === 0 ? (STATUS_LABELS[o.status] || o.status) : '',
            item.nombre,
            item.categoria || '',
            item.size || '',
            item.qty,
            item.available_qty ?? item.qty,
            (item.unit_price || 0).toFixed(2),
            (qty * (item.unit_price || 0)).toFixed(2),
            idx === 0 ? (o.total || 0).toFixed(2) : '',
          ])
        })
      }
    })

    const csv = rows
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${periodLabel.toLowerCase().replace(/ /g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })
    const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || period
    const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

    // Header
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.text('SHENZHEN WENYUE LTD. LIABILITY CO.', 14, 18)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Reporte de Ventas — ${periodLabel}`, 14, 26)
    doc.setFontSize(8)
    doc.setTextColor(130)
    doc.text(`Generado: ${fecha}  ·  ${filteredOrders.length} pedidos`, 14, 32)
    doc.setTextColor(0)

    // KPIs inline
    const kpiY = 40
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    const kpiItems = [
      [`Total facturado`, `$${kpis.totalRevenue.toFixed(2)}`],
      [`Pedidos`, `${kpis.totalOrders} (${kpis.paidOrders} conv.)`],
      [`Ticket promedio`, `$${kpis.avgTicket.toFixed(2)}`],
      [`Unidades vendidas`, `${kpis.totalUnits}`],
      [`Pipeline pendiente`, `$${kpis.pendingRevenue.toFixed(2)}`],
    ]
    kpiItems.forEach(([label, val], idx) => {
      const x = 14 + idx * 54
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      doc.text(label, x, kpiY)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0)
      doc.text(val, x, kpiY + 6)
    })

    // Orders table
    autoTable(doc, {
      startY: kpiY + 14,
      head: [['ID', 'Fecha', 'Cliente', 'Status', 'Productos', 'Total']],
      body: filteredOrders.map(o => [
        o.id.substring(0, 8).toUpperCase(),
        new Date(o.created_at).toLocaleDateString('es-MX'),
        o.customer_name,
        STATUS_LABELS[o.status] || o.status,
        (o.items || [])
          .map(i => `${i.available_qty || i.qty}× ${i.nombre}${i.size ? ` (${i.size})` : ''}`)
          .join(', '),
        `$${(o.total || 0).toFixed(2)}`,
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22 },
        2: { cellWidth: 40 },
        3: { cellWidth: 24 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 24, halign: 'right' },
      },
    })

    // Page 2: category + top products
    doc.addPage()
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Desglose por categoría', 14, 18)
    doc.setFont('helvetica', 'normal')

    autoTable(doc, {
      startY: 24,
      head: [['Categoría', 'Unidades vendidas', 'Ingresos']],
      body: categoryBreakdown.map(([cat, data]) => [cat, data.qty, `$${data.revenue.toFixed(2)}`]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 0, 0] },
      columnStyles: { 2: { halign: 'right' } },
    })

    const afterCat = (doc.lastAutoTable?.finalY || 60) + 14
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top 10 productos', 14, afterCat)
    doc.setFont('helvetica', 'normal')

    autoTable(doc, {
      startY: afterCat + 6,
      head: [['Producto', 'Categoría', 'Unidades', 'Ingresos']],
      body: topProducts.map(([name, data]) => [
        name, data.categoria || '', data.qty, `$${data.revenue.toFixed(2)}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 0, 0] },
      columnStyles: { 3: { halign: 'right' } },
    })

    doc.save(`reporte-${periodLabel.toLowerCase().replace(/ /g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const maxRevCat = categoryBreakdown[0]?.[1].revenue || 1

  return (
    <div className="space-y-5">
      {/* Period selector + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-black text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:border-gray-400 transition-colors"
          >
            CSV (Excel)
          </button>
          <button
            onClick={exportPDF}
            className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KPICard
          label="Total facturado"
          value={`$${kpis.totalRevenue.toFixed(2)}`}
          sub="pagados + enviados + archivados"
          highlight
        />
        <KPICard
          label="Pedidos recibidos"
          value={kpis.totalOrders}
          sub={`${kpis.paidOrders} convertidos a venta`}
        />
        <KPICard
          label="Ticket promedio"
          value={`$${kpis.avgTicket.toFixed(2)}`}
          sub="por pedido convertido"
        />
        <KPICard
          label="Unidades vendidas"
          value={kpis.totalUnits}
          sub="en pedidos confirmados"
        />
        <KPICard
          label="Pipeline pendiente"
          value={`$${kpis.pendingRevenue.toFixed(2)}`}
          sub="pendientes + confirmados"
        />
        <KPICard
          label="Conversión"
          value={kpis.totalOrders > 0 ? `${Math.round((kpis.paidOrders / kpis.totalOrders) * 100)}%` : '—'}
          sub="pedidos → ventas"
        />
        {kpis.tieneCostos && (
          <KPICard
            label="Ganancia bruta"
            value={`$${kpis.ganancia.toFixed(2)}`}
            sub="ingresos − costo de mercancía"
            highlight
          />
        )}
        {kpis.tieneCostos && kpis.margen !== null && (
          <KPICard
            label="Margen bruto"
            value={`${kpis.margen.toFixed(1)}%`}
            sub="sobre pedidos con costo definido"
          />
        )}
        {capitalItems.filter(i => !i.pagado).length > 0 && (
          <KPICard
            label="Stock de Bodega pendiente"
            value={`$${capitalItems.filter(i => !i.pagado).reduce((s, i) => s + i.qty * i.costo_unit, 0).toFixed(2)}`}
            sub="costo personal sin reembolsar"
            amber
          />
        )}
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Ingresos por categoría</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {categoryBreakdown.map(([cat, data]) => (
              <div key={cat} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 font-medium">{cat}</span>
                  <div className="flex gap-4 text-sm items-baseline">
                    <span className="text-gray-400">{data.qty} u.</span>
                    <span className="font-bold text-gray-900 w-20 text-right">${data.revenue.toFixed(2)}</span>
                    {data.ganancia !== null && (
                      <span className="text-green-600 font-semibold w-20 text-right text-xs">
                        +${data.ganancia.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full transition-all"
                    style={{ width: `${(data.revenue / maxRevCat) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top products */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Top productos</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {topProducts.map(([name, data], idx) => (
              <div key={name} className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono w-4">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium truncate">{name}</p>
                  <p className="text-xs text-gray-400">{data.categoria}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">${data.revenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{data.qty} u.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock de Bodega */}
      {capitalItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">Stock de Bodega</h3>
              <p className="text-xs text-amber-600 mt-0.5">Inventario que ya estaba en la bodega antes de este sistema. El costo será reembolsado al venderse — la ganancia se reparte de forma normal.</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-amber-600">Pendiente</p>
              <p className="text-base font-bold text-amber-700">
                ${capitalItems.filter(i => !i.pagado).reduce((s, i) => s + i.qty * i.costo_unit, 0).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {capitalItems.map(item => (
              <div key={item.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${item.pagado ? 'opacity-50' : ''}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${item.pagado ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.nombre}
                    </span>
                    {item.categoria && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.categoria}</span>
                    )}
                    {item.pagado && (
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Reembolsado</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.qty} u. × ${parseFloat(item.costo_unit).toFixed(2)}
                    {item.fecha_compra && ` · ${new Date(item.fecha_compra + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    {item.notas && ` · ${item.notas}`}
                  </p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${item.pagado ? 'text-gray-400' : 'text-amber-700'}`}>
                  ${(item.qty * item.costo_unit).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between text-xs text-gray-500">
            <span>Total invertido</span>
            <span className="font-semibold text-gray-800">
              ${capitalItems.reduce((s, i) => s + i.qty * i.costo_unit, 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Orders detail */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">
            Todos los pedidos — {PERIOD_OPTIONS.find(p => p.value === period)?.label}
            <span className="ml-2 text-gray-400 font-normal">({filteredOrders.length})</span>
          </h3>
        </div>
        {filteredOrders.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">Sin pedidos en este período</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredOrders.map(o => (
              <div key={o.id} className="px-4 py-3">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{o.customer_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] || ''}`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      #{o.id.substring(0, 8).toUpperCase()} ·{' '}
                      {new Date(o.created_at).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 shrink-0 ml-3">
                    ${(o.total || 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {(o.items || []).map((item, i) => (
                    <span key={i} className="inline-block mr-3">
                      {item.available_qty || item.qty}× {item.nombre}
                      {item.size ? ` (${item.size})` : ''}
                    </span>
                  ))}
                </div>
                {o.tracking_number && (
                  <p className="text-xs text-blue-600 mt-1">Tracking: {o.tracking_number}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function KPICard({ label, value, sub, highlight, amber }) {
  const bg = highlight ? 'bg-black text-white border-black' : amber ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'
  const labelColor = highlight ? 'text-gray-400' : amber ? 'text-amber-600' : 'text-gray-400'
  const valueColor = highlight ? 'text-white' : amber ? 'text-amber-700' : 'text-gray-900'
  return (
    <div className={`rounded-2xl border shadow-sm px-4 py-3 ${bg}`}>
      <p className={`text-xs mb-1 ${labelColor}`}>{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${labelColor}`}>{sub}</p>}
    </div>
  )
}
