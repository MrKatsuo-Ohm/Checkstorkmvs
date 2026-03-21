import React, { useState } from 'react'
import { SearchX, Package, MapPin, Edit3, Trash2, Check, Download, QrCode } from 'lucide-react'
import { printSerialQR } from '../utils/printQR'
import * as LucideIcons from 'lucide-react'
import { useStock } from '../context/StockContext'
import { categories } from '../utils/constants'
import { formatNumber, formatCurrency, getStockStatus } from '../utils/helpers'

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 bg-slate-700 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-700 rounded w-3/4" />
          <div className="h-3 bg-slate-700 rounded w-1/2" />
        </div>
        <div className="h-6 w-16 bg-slate-700 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-16 bg-slate-700 rounded-lg" />
        <div className="h-16 bg-slate-700 rounded-lg" />
      </div>
      <div className="h-8 bg-slate-700 rounded-lg" />
    </div>
  )
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(items) {
  const headers = ['รหัสสินค้า', 'ชื่อสินค้า', 'หมวดหมู่', 'หมวดหมู่ย่อย', 'จำนวน', 'Serial', 'ราคา/หน่วย', 'มูลค่ารวม', 'ตำแหน่ง', 'หมายเหตุ']
  const rows = items.flatMap(i => {
    const serials = i.serials || []
    if (serials.length === 0) {
      return [[
        i.product_code || '', i.name,
        categories[i.category]?.name || i.category, i.subcategory,
        i.quantity, '', i.price, i.price * i.quantity,
        i.location || '', i.notes || ''
      ]]
    }
    return serials.map((s, idx) => [
      idx === 0 ? (i.product_code || '') : '',
      idx === 0 ? i.name : '',
      idx === 0 ? (categories[i.category]?.name || i.category) : '',
      idx === 0 ? i.subcategory : '',
      idx === 0 ? i.quantity : '',
      s,
      idx === 0 ? i.price : '',
      idx === 0 ? i.price * i.quantity : '',
      idx === 0 ? (i.location || '') : '',
      idx === 0 ? (i.notes || '') : ''
    ])
  })

  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inventory_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Inventory({ search, filterCategory, onEdit }) {
  const { items, deleteItem, loading } = useStock()
  const [confirming, setConfirming] = useState(null)

  // ค้นหาทั้งชื่อสินค้า, subcategory, location และ serial
  let filtered = [...items]
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.subcategory.toLowerCase().includes(q) ||
      (i.location || '').toLowerCase().includes(q) ||
      (i.product_code || '').toLowerCase().includes(q) ||
      (i.serials || []).some(s => s.toLowerCase().includes(q))
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
    setConfirming(null)
    await deleteItem(id)
  }

  // Skeleton loading
  if (loading && items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-slate-700 rounded-lg animate-pulse" />
          <div className="h-5 w-24 bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">คลังสินค้า</h2>
        <div className="flex items-center gap-2">
          <p className="text-slate-400 text-sm">
            {filtered.length} รายการ · {filtered.reduce((s, i) => s + (i.serials?.length || i.quantity), 0)} ชิ้น
          </p>
          <button
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
            <SearchX className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-slate-400">{items.length === 0 ? 'ยังไม่มีสินค้าในระบบ' : 'ไม่พบสินค้าที่ค้นหา'}</p>
          {search && (
            <p className="text-slate-500 text-sm mt-1">ลองค้นหาด้วย ชื่อ, serial, รหัส หรือตำแหน่ง</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const status = getStockStatus(item)
            const cat = categories[item.category]
            const CatIcon = LucideIcons[cat?.icon] || Package
            const StatusIcon = LucideIcons[status.icon] || Package
            const isConfirming = confirming === item.id
            const itemId = item.id || item._id

            // highlight serial ที่ค้นหาเจอ
            const matchedSerials = search
              ? (item.serials || []).filter(s => s.toLowerCase().includes(search.toLowerCase()))
              : []

            return (
              <div key={itemId} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                      <CatIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
                      <p className="text-xs text-slate-400">
                        {item.subcategory}
                        {item.product_code && <span className="ml-1 font-mono text-slate-500">#{item.product_code}</span>}
                      </p>
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

                {/* Serial list — ถ้าค้นหาเจอ serial ให้ highlight */}
                {item.serials?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-1.5">
                      Serials ({item.serials.length} ชิ้น)
                      {matchedSerials.length > 0 && (
                        <span className="ml-1 text-blue-400">· พบ {matchedSerials.length} ที่ค้นหา</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {item.serials.map(s => {
                        const isMatch = matchedSerials.includes(s)
                        return (
                          <span
                            key={s}
                            className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                              isMatch
                                ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {s}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {item.location || 'ไม่ระบุ'}
                  </span>

                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />แก้ไข
                  </button>
                  {item.serials?.length > 0 && (
                    <button
                      onClick={() => printSerialQR(item.name, item.serials)}
                      title="พิมพ์ QR Code"
                      className="flex items-center justify-center px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(itemId)}
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
