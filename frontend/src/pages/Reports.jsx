import React from 'react'
import { BarChart3, Package, Calculator, Banknote } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useStock } from '../context/StockContext'
import { categories } from '../utils/constants'
import { formatNumber, formatCurrency } from '../utils/helpers'

export default function Reports() {
  const { items } = useStock()
  const totalValue = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)

  const catData = Object.entries(categories).map(([key, cat]) => {
    const filtered = items.filter(i => i.category === key)
    const value = filtered.reduce((s, i) => s + i.price * i.quantity, 0)
    return { key, ...cat, count: filtered.length, value }
  }).filter(c => c.count > 0)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-blue-400" />รายงานสรุป
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'จำนวนรายการ', value: items.length, Icon: Package, color: 'bg-blue-500/20', iconColor: 'text-blue-400' },
          { label: 'จำนวนชิ้นรวม', value: formatNumber(totalQty), Icon: Calculator, color: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
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
                      <span className="text-slate-400 text-sm">({cat.count} รายการ)</span>
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
