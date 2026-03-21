import React from 'react'
import { BarChart3, Package, Calculator, Banknote, Download } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useStock } from '../context/StockContext'
import { categories } from '../utils/constants'
import { formatNumber, formatCurrency } from '../utils/helpers'

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV(items) {
  const headers = ['รหัสสินค้า', 'ชื่อสินค้า', 'หมวดหมู่', 'หมวดหมู่ย่อย', 'จำนวน', 'Serial (ชิ้น)', 'ราคา/หน่วย', 'มูลค่ารวม', 'ตำแหน่ง', 'หมายเหตุ']
  const rows = items.map(i => [
    i.product_code || '',
    i.name,
    categories[i.category]?.name || i.category,
    i.subcategory,
    i.quantity,
    i.serials?.length || i.quantity,
    i.price,
    i.price * i.quantity,
    i.location || '',
    i.notes || ''
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const BOM = '\uFEFF' // รองรับภาษาไทยใน Excel
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stock_report_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const { items } = useStock()
  const totalValue   = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalSerials = items.reduce((s, i) => s + (i.serials?.length || i.quantity), 0)

  const catData = Object.entries(categories).map(([key, cat]) => {
    const filtered = items.filter(i => i.category === key)
    const value = filtered.reduce((s, i) => s + i.price * i.quantity, 0)
    const serialCount = filtered.reduce((s, i) => s + (i.serials?.length || i.quantity), 0)
    return { key, ...cat, count: filtered.length, serialCount, value }
  }).filter(c => c.count > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />รายงานสรุป
        </h2>
        {/* ปุ่ม Export CSV */}
        <button
          onClick={() => exportCSV(items)}
          disabled={items.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'จำนวนรายการ (product)', value: formatNumber(items.length), Icon: Package, color: 'bg-blue-500/20', iconColor: 'text-blue-400' },
          { label: 'จำนวนชิ้นรวม (serial)', value: formatNumber(totalSerials), Icon: Calculator, color: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
          { label: 'มูลค่ารวม', value: formatCurrency(totalValue), Icon: Banknote, color: 'bg-amber-500/20', iconColor: 'text-amber-400' }
        ].map(({ label, value, Icon, color, iconColor }) => (
          <div key={label} className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart by category */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4">มูลค่าแยกตามหมวดหมู่</h3>
        {catData.length === 0 ? (
          <p className="text-slate-400 text-center py-8">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-4">
            {catData.map(cat => {
              const pct = totalValue > 0 ? (cat.value / totalValue * 100) : 0
              const Icon = LucideIcons[cat.icon] || Package
              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-blue-400" />
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-slate-400 text-sm">({cat.serialCount} ชิ้น · {cat.count} รายการ)</span>
                    </div>
                    <span className="font-bold text-emerald-400">{formatCurrency(cat.value)}</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-slate-400 mt-1">{pct.toFixed(1)}%</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
