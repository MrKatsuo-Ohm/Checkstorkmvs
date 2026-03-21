import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, Package, Edit3, Settings2 } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useStock } from '../context/StockContext'
import { categories } from '../utils/constants'
import { getStockStatus } from '../utils/helpers'

export default function LowStock({ onEdit }) {
  const { items } = useStock()
  // แก้: buffer ที่ผู้ใช้กำหนดได้ แทน hardcode +10
  const [buffer, setBuffer] = useState(10)

  const lowItems = items.filter(i => i.quantity <= i.min_stock)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
          สินค้าที่ต้องสั่งเพิ่ม
        </h2>
        <div className="flex items-center gap-2">
          <p className="text-slate-400 text-sm">{lowItems.length} รายการ</p>
          {/* Buffer control */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl">
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">บัฟเฟอร์</span>
            <input
              type="number"
              min="0"
              max="999"
              value={buffer}
              onChange={e => setBuffer(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-12 text-center text-xs bg-slate-700 border border-slate-600 rounded-lg px-1 py-0.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {lowItems.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <p className="text-slate-300 font-medium">ยอดเยี่ยม! สต๊อกทุกรายการอยู่ในระดับปกติ</p>
        </div>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="md:hidden space-y-3">
            {lowItems.map(item => {
              const cat = categories[item.category]
              const CatIcon = LucideIcons[cat?.icon] || Package
              const status = getStockStatus(item)
              // แก้: ใช้ buffer จาก state แทน hardcode +10
              const needed = Math.max(0, item.min_stock - item.quantity + buffer)
              return (
                <div key={item.id || item._id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                      <CatIcon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">{item.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{cat?.name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center text-sm">
                    <div className="bg-slate-700/50 rounded-lg p-2">
                      <p className="text-xs text-slate-400">คงเหลือ</p>
                      <p className={`font-bold mt-0.5 ${status.className}`}>{item.quantity}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-2">
                      <p className="text-xs text-slate-400">ขั้นต่ำ</p>
                      <p className="font-bold mt-0.5">{item.min_stock}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-2">
                      <p className="text-xs text-slate-400">สั่งเพิ่ม</p>
                      <p className="font-bold text-amber-400 mt-0.5">{needed}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onEdit(item)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Edit3 className="w-4 h-4" /> อัพเดทสต๊อก
                  </button>
                </div>
              )
            })}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left py-4 px-6 text-slate-300 font-medium">สินค้า</th>
                    <th className="text-center py-4 px-6 text-slate-300 font-medium">คงเหลือ</th>
                    <th className="text-center py-4 px-6 text-slate-300 font-medium">ขั้นต่ำ</th>
                    <th className="text-center py-4 px-6 text-slate-300 font-medium">
                      ต้องสั่งเพิ่ม
                      <span className="text-xs text-slate-500 font-normal ml-1">(+บัฟเฟอร์ {buffer})</span>
                    </th>
                    <th className="text-center py-4 px-6 text-slate-300 font-medium">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {lowItems.map(item => {
                    const cat = categories[item.category]
                    const CatIcon = LucideIcons[cat?.icon] || Package
                    const status = getStockStatus(item)
                    const needed = Math.max(0, item.min_stock - item.quantity + buffer)
                    return (
                      <tr key={item.id || item._id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
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
          </div>
        </>
      )}
    </div>
  )
}
