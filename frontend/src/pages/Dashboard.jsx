import React from 'react'
import { Package, Banknote, AlertTriangle, PackageX, Grid3x3, Clock, Inbox } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useStock } from '../context/StockContext'
import { categories } from '../utils/constants'
import { formatNumber, formatCurrency, getStockStatus } from '../utils/helpers'

function StatCard({ label, value, sub, color, Icon }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          <p className="text-sm mt-1 opacity-80">{sub}</p>
        </div>
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ onNavigate, onFilterCategory }) {
  const { items } = useStock()

  const totalValue = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const lowStock = items.filter(i => i.quantity <= i.min_stock).length
  const outOfStock = items.filter(i => i.quantity === 0).length

  const categoryStats = Object.entries(categories).map(([key, cat]) => {
    const filtered = items.filter(i => i.category === key)
    return {
      key, ...cat,
      count: filtered.length,
      value: filtered.reduce((s, i) => s + i.price * i.quantity, 0)
    }
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="สินค้าทั้งหมด" value={formatNumber(items.length)} sub="รายการ"
          color="from-blue-500/20 to-blue-600/10 border border-blue-500/30" Icon={Package} />
        <StatCard label="มูลค่ารวม" value={formatCurrency(totalValue)} sub="บาท"
          color="from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30" Icon={Banknote} />
        <StatCard label="สต๊อกต่ำ" value={formatNumber(lowStock)} sub="รายการ"
          color="from-amber-500/20 to-amber-600/10 border border-amber-500/30" Icon={AlertTriangle} />
        <StatCard label="สินค้าหมด" value={formatNumber(outOfStock)} sub="รายการ"
          color="from-red-500/20 to-red-600/10 border border-red-500/30" Icon={PackageX} />
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-blue-400" />สรุปตามหมวดหมู่
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categoryStats.map(cat => {
            const Icon = LucideIcons[cat.icon] || Package
            return (
              <button
                key={cat.key}
                onClick={() => { onFilterCategory(cat.key); onNavigate('inventory') }}
                className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl p-4 text-center transition-all"
              >
                <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-400" />
                </div>
                <p className="font-medium text-sm">{cat.name}</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{cat.count}</p>
                <p className="text-xs text-slate-400">{formatCurrency(cat.value)}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />รายการล่าสุด
        </h2>
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
              <Inbox className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-400">ยังไม่มีสินค้าในระบบ</p>
            <button onClick={() => onNavigate('add')}
              className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium transition-colors">
              เพิ่มสินค้าแรก
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">สินค้า</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">หมวดหมู่</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">จำนวน</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">ราคา</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 5).map(item => {
                  const status = getStockStatus(item)
                  const cat = categories[item.category]
                  const CatIcon = LucideIcons[cat?.icon] || Package
                  const StatusIcon = LucideIcons[status.icon] || Package
                  return (
                    <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                            <CatIcon className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-slate-400">{item.subcategory}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{cat?.name || item.category}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatNumber(item.quantity)}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">{formatCurrency(item.price)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.text}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
