import React, { useState, useMemo } from 'react'
import {
  ClipboardCheck, AlertTriangle, TrendingUp, TrendingDown,
  CheckCircle2, ChevronDown, ChevronRight, Package, Calendar,
  User, BarChart3
} from 'lucide-react'
import { useHistory } from '../context/HistoryContext'
import { useStock } from '../context/StockContext'
import { categories } from '../utils/constants'

function formatDateTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDateOnly(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function CountSummary() {
  const { history } = useHistory()
  const { items } = useStock()
  const [expandedCat, setExpandedCat] = useState(null)
  const [filterDate, setFilterDate] = useState('today')
  const [filterUser, setFilterUser] = useState('all')

  // กรองเฉพาะ history ที่มาจากการนับสต๊อก (type === 'update' ที่มี note นับสต๊อก)
  const countHistory = history.filter(h => h.type === 'update')

  // filter ตาม date
  const now = new Date()
  const filtered = countHistory.filter(h => {
    const d = new Date(h.timestamp)
    if (filterDate === 'today') return d.toDateString() === now.toDateString()
    if (filterDate === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
      return d >= weekAgo
    }
    if (filterDate === 'month') {
      const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1)
      return d >= monthAgo
    }
    return true // all
  }).filter(h => filterUser === 'all' || h.counter === filterUser)

  const users = [...new Set(countHistory.map(h => h.counter))].filter(Boolean)

  // สรุปแยกตาม category
  const catSummary = useMemo(() => {
    const summary = {}
    filtered.forEach(h => {
      const cat = h.category || 'unknown'
      if (!summary[cat]) {
        summary[cat] = { short: [], over: [], match: [] }
      }
      const diff = h.quantityAfter - h.quantityBefore
      if (diff < 0) summary[cat].short.push(h)
      else if (diff > 0) summary[cat].over.push(h)
      else summary[cat].match.push(h)
    })
    return summary
  }, [filtered])

  // รายการที่ไม่ครบทั้งหมด
  const allShort = filtered.filter(h => h.quantityAfter < h.quantityBefore)
  // รายการที่เกินทั้งหมด
  const allOver = filtered.filter(h => h.quantityAfter > h.quantityBefore)
  // รายการที่ตรงกัน
  const allMatch = filtered.filter(h => h.quantityAfter === h.quantityBefore)

  const totalDiff = allShort.reduce((s, h) => s + (h.quantityBefore - h.quantityAfter), 0)

  if (filtered.length === 0 && filterDate === 'today') {
    return (
      <div className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
          สรุปการนับสต๊อก
        </h2>
        <div className="flex flex-wrap gap-2">
          <select value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="today">วันนี้</option>
            <option value="week">7 วันล่าสุด</option>
            <option value="month">30 วันล่าสุด</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
            <ClipboardCheck className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-slate-400">ยังไม่มีการนับสต๊อกวันนี้</p>
          <p className="text-slate-500 text-sm mt-1">ลองเลือกช่วงเวลาอื่น</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
          สรุปการนับสต๊อก
        </h2>
        <span className="text-slate-400 text-sm">{filtered.length} รายการที่นับ</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="today">วันนี้</option>
          <option value="week">7 วันล่าสุด</option>
          <option value="month">30 วันล่าสุด</option>
          <option value="all">ทั้งหมด</option>
        </select>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">ทุกคน</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">นับทั้งหมด</span>
          </div>
          <p className="text-2xl font-bold text-white">{filtered.length}</p>
          <p className="text-xs text-slate-500">รายการ</p>
        </div>
        <div className="bg-slate-800 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-400">ไม่ครบ</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{allShort.length}</p>
          <p className="text-xs text-slate-500">ขาด {totalDiff} ชิ้น</p>
        </div>
        <div className="bg-slate-800 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">เกิน</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{allOver.length}</p>
          <p className="text-xs text-slate-500">รายการ</p>
        </div>
        <div className="bg-slate-800 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">ตรงกัน</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{allMatch.length}</p>
          <p className="text-xs text-slate-500">รายการ</p>
        </div>
      </div>

      {/* สรุปแยก category */}
      {Object.keys(catSummary).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" /> สรุปแยกตามหมวด
          </h3>
          {Object.entries(catSummary).map(([catKey, data]) => {
            const cat = categories[catKey]
            const total = data.short.length + data.over.length + data.match.length
            const isExpanded = expandedCat === catKey
            const hasIssues = data.short.length > 0 || data.over.length > 0
            return (
              <div key={catKey} className={`bg-slate-800 border rounded-2xl overflow-hidden transition-colors ${
                hasIssues ? 'border-red-500/20' : 'border-slate-700'
              }`}>
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : catKey)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <span className="font-semibold text-white">{cat?.name || catKey}</span>
                    <span className="text-xs text-slate-500">{total} รายการ</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {data.short.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                        <TrendingDown className="w-3.5 h-3.5" /> ไม่ครบ {data.short.length}
                      </span>
                    )}
                    {data.over.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                        <TrendingUp className="w-3.5 h-3.5" /> เกิน {data.over.length}
                      </span>
                    )}
                    {data.short.length === 0 && data.over.length === 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ครบ
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-slate-400" />
                      : <ChevronRight className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700/60 divide-y divide-slate-700/40">
                    {/* ไม่ครบ */}
                    {data.short.map(h => (
                      <div key={h.id} className="flex items-start gap-3 px-4 py-3 bg-red-500/5">
                        <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white leading-tight">{h.itemName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{h.subcategory}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm">
                            <span className="text-slate-400">{h.quantityBefore}</span>
                            <span className="text-slate-600 mx-1">→</span>
                            <span className="text-red-400 font-bold">{h.quantityAfter}</span>
                          </p>
                          <p className="text-xs text-red-400 font-semibold">
                            ขาด {h.quantityBefore - h.quantityAfter} ชิ้น
                          </p>
                        </div>
                      </div>
                    ))}
                    {/* เกิน */}
                    {data.over.map(h => (
                      <div key={h.id} className="flex items-start gap-3 px-4 py-3 bg-amber-500/5">
                        <TrendingUp className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white leading-tight">{h.itemName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{h.subcategory}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm">
                            <span className="text-slate-400">{h.quantityBefore}</span>
                            <span className="text-slate-600 mx-1">→</span>
                            <span className="text-amber-400 font-bold">{h.quantityAfter}</span>
                          </p>
                          <p className="text-xs text-amber-400 font-semibold">
                            เกิน {h.quantityAfter - h.quantityBefore} ชิ้น
                          </p>
                        </div>
                      </div>
                    ))}
                    {/* ตรงกัน */}
                    {data.match.map(h => (
                      <div key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                        <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-400 leading-tight truncate">{h.itemName}</p>
                        </div>
                        <span className="text-xs text-emerald-400 shrink-0">{h.quantityAfter} ชิ้น ✓</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* รายการไม่ครบทั้งหมด */}
      {allShort.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> รายการที่ไม่ครบ ({allShort.length} รายการ · ขาดรวม {totalDiff} ชิ้น)
          </h3>
          <div className="bg-slate-800 border border-red-500/20 rounded-2xl overflow-hidden">
            {allShort.map((h, i) => (
              <div key={h.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-700/60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white leading-tight">{h.itemName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {categories[h.category]?.name || h.category} › {h.subcategory}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                    <User className="w-3 h-3" /> {h.counter} · {formatDateTime(h.timestamp)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm">
                    <span className="text-slate-400">{h.quantityBefore}</span>
                    <span className="text-slate-600 mx-1">→</span>
                    <span className="text-red-400 font-bold">{h.quantityAfter}</span>
                  </p>
                  <p className="text-xs text-red-400 font-bold">ขาด {h.quantityBefore - h.quantityAfter} ชิ้น</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* รายการเกินทั้งหมด */}
      {allOver.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> รายการที่เกิน ({allOver.length} รายการ)
          </h3>
          <div className="bg-slate-800 border border-amber-500/20 rounded-2xl overflow-hidden">
            {allOver.map((h, i) => (
              <div key={h.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-700/60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white leading-tight">{h.itemName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {categories[h.category]?.name || h.category} › {h.subcategory}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                    <User className="w-3 h-3" /> {h.counter} · {formatDateTime(h.timestamp)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm">
                    <span className="text-slate-400">{h.quantityBefore}</span>
                    <span className="text-slate-600 mx-1">→</span>
                    <span className="text-amber-400 font-bold">{h.quantityAfter}</span>
                  </p>
                  <p className="text-xs text-amber-400 font-bold">เกิน {h.quantityAfter - h.quantityBefore} ชิ้น</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length > 0 && allShort.length === 0 && allOver.length === 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-400 font-semibold">สต๊อกตรงกันทุกรายการ 🎉</p>
          <p className="text-slate-400 text-sm mt-1">จำนวนที่นับตรงกับระบบทั้งหมด</p>
        </div>
      )}
    </div>
  )
}
