import React, { useState } from 'react'
import { SearchX, Package, MapPin, Edit3, Trash2, Check } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useStock } from '../context/StockContext'
import { categories } from '../utils/constants'
import { formatNumber, formatCurrency, getStockStatus } from '../utils/helpers'

export default function Inventory({ search, filterCategory, onEdit }) {
  const { items, deleteItem } = useStock()
  const [confirming, setConfirming] = useState(null)

  let filtered = [...items]
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.subcategory.toLowerCase().includes(q) ||
      (i.location || '').toLowerCase().includes(q)
    )
  }
  if (filterCategory !== 'all') {
    filtered = filtered.filter(i => i.category === filterCategory)
  }

  const handleDelete = async (id) => {
    if (confirming !== id) {
      setConfirming(id)
      setTimeout(() => setConfirming(c => c === id ? null : c), 3000)
      return
    }
    // reset confirming first, then delete
    setConfirming(null)
    await deleteItem(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">คลังสินค้า</h2>
        <p className="text-slate-400">แสดง {filtered.length} รายการ · {filtered.reduce((s,i) => s + (i.serials?.length || i.quantity), 0)} ชิ้น</p>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
            <SearchX className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-slate-400">{items.length === 0 ? 'ยังไม่มีสินค้าในระบบ' : 'ไม่พบสินค้าที่ค้นหา'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const status = getStockStatus(item)
            const cat = categories[item.category]
            const CatIcon = LucideIcons[cat?.icon] || Package
            const StatusIcon = LucideIcons[status.icon] || Package
            const isConfirming = confirming === item.id

            return (
              <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                      <CatIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
                      <p className="text-xs text-slate-400">{item.subcategory}{item.product_code && <span className="ml-1 font-mono text-slate-500">#{item.product_code}</span>}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${status.className}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.text}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">จำนวน (ระบบ)</p>
                    <p className="text-xl font-bold">{formatNumber(item.quantity)}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">ราคา/หน่วย</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(item.price)}</p>
                  </div>
                </div>

                {/* Serial list */}
                {item.serials?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-1.5">Serials ({item.serials.length} ชิ้น)</p>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {item.serials.map(s => (
                        <span key={s} className="text-xs font-mono bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {item.location || 'ไม่ระบุ'}
                  </span>
                  <span>Min: {item.min_stock}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isConfirming
                        ? 'bg-red-500 text-white'
                        : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                    }`}
                  >
                    {isConfirming ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
