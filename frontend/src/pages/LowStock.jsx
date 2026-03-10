import React from 'react'
import { AlertTriangle, CheckCircle, Package } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useStock } from '../context/StockContext'
import { categories } from '../utils/constants'
import { getStockStatus } from '../utils/helpers'

export default function LowStock({ onEdit }) {
  const { items } = useStock()
  const lowItems = items.filter(i => i.quantity <= i.min_stock)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-400" />สินค้าที่ต้องสั่งเพิ่ม
        </h2>
        <p className="text-slate-400">{lowItems.length} รายการ</p>
      </div>

      {lowItems.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <p className="text-slate-300 font-medium">ยอดเยี่ยม! สต๊อกทุกรายการอยู่ในระดับปกติ</p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">สินค้า</th>
                <th className="text-center py-4 px-6 text-slate-300 font-medium">คงเหลือ</th>
                <th className="text-center py-4 px-6 text-slate-300 font-medium">ขั้นต่ำ</th>
                <th className="text-center py-4 px-6 text-slate-300 font-medium">ต้องสั่งเพิ่ม</th>
                <th className="text-center py-4 px-6 text-slate-300 font-medium">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {lowItems.map(item => {
                const cat = categories[item.category]
                const CatIcon = LucideIcons[cat?.icon] || Package
                const status = getStockStatus(item)
                const needed = Math.max(0, item.min_stock - item.quantity + 10)
                return (
                  <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                          <CatIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-slate-400">{cat?.name || item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${status.className}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center text-slate-300">{item.min_stock}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-amber-400 font-bold">{needed}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => onEdit(item)}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        อัพเดทสต๊อก
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
