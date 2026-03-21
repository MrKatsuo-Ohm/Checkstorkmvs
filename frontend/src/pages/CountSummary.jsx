import React, { useState, useMemo } from 'react'
import {
  ClipboardCheck, AlertTriangle, TrendingUp, TrendingDown,
  CheckCircle2, ChevronDown, ChevronRight, Package,
  User, BarChart3, FileDown
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

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportPDF({ allShort, allOver, items, filterDate, filterUser }) {
  const now = new Date().toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  // หา serial ที่ขาด/เกินของแต่ละรายการ
  const getSerialDetail = (h) => {
    const item = items.find(i => i._id === h.itemId || i.id === h.itemId)
    if (!item?.serials?.length) return null
    return item.serials
  }

  const buildRows = (list, type) => list.map(h => {
    const serials = getSerialDetail(h)
    const diff = type === 'short'
      ? h.quantityBefore - h.quantityAfter
      : h.quantityAfter - h.quantityBefore
    const serialHTML = serials
      ? `<div class="serials">${serials.map(s =>
          `<span class="serial-tag">${s}</span>`
        ).join('')}</div>`
      : ''
    const color = type === 'short' ? '#ef4444' : '#f59e0b'
    const label = type === 'short'
      ? `<span style="color:${color}">ขาด ${diff} ชิ้น</span>`
      : `<span style="color:${color}">เกิน ${diff} ชิ้น</span>`
    return `
      <tr>
        <td>
          <div class="item-name">${h.itemName}</div>
          <div class="item-sub">${categories[h.category]?.name || h.category} › ${h.subcategory}</div>
          <div class="item-meta">ผู้นับ: ${h.counter} · ${formatDateTime(h.timestamp)}</div>
          ${serialHTML}
        </td>
        <td class="qty-cell">
          <span class="qty-before">${h.quantityBefore}</span>
          <span class="arrow">→</span>
          <span class="qty-after" style="color:${color}">${h.quantityAfter}</span>
        </td>
        <td class="diff-cell">${label}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8"/>
<title>รายงานสรุปการนับสต๊อก</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun', 'Tahoma', sans-serif; font-size: 13px; color: #1e293b; padding: 24px; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #0f172a; }
  .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
  .summary-cards { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 18px; min-width: 130px; }
  .card-label { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
  .card-value { font-size: 22px; font-weight: 700; }
  .card.red { border-color: #fecaca; background: #fff5f5; }
  .card.red .card-value { color: #ef4444; }
  .card.amber { border-color: #fde68a; background: #fffbeb; }
  .card.amber .card-value { color: #f59e0b; }
  h2 { font-size: 14px; font-weight: 700; margin: 20px 0 8px; padding: 6px 10px; border-radius: 6px; }
  h2.red { background: #fee2e2; color: #b91c1c; }
  h2.amber { background: #fef3c7; color: #92400e; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 12px; color: #475569; border-bottom: 1px solid #e2e8f0; }
  td { padding: 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .item-name { font-weight: 600; font-size: 13px; margin-bottom: 2px; }
  .item-sub { font-size: 11px; color: #64748b; }
  .item-meta { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .serials { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px; }
  .serial-tag { font-family: monospace; font-size: 11px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px 5px; color: #334155; }
  .qty-cell { text-align: center; white-space: nowrap; font-size: 13px; }
  .qty-before { color: #94a3b8; }
  .arrow { color: #cbd5e1; margin: 0 4px; }
  .qty-after { font-weight: 700; }
  .diff-cell { text-align: right; white-space: nowrap; font-weight: 700; font-size: 13px; }
  @media print {
    body { padding: 16px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <h1>รายงานสรุปการนับสต๊อก — รายการผิดปกติ</h1>
  <div class="meta">
    พิมพ์เมื่อ: ${now}
    ${filterUser !== 'all' ? ` · ผู้นับ: ${filterUser}` : ''}
    · ช่วงเวลา: ${{ today: 'วันนี้', week: '7 วันล่าสุด', month: '30 วันล่าสุด', all: 'ทั้งหมด' }[filterDate] || filterDate}
  </div>

  <div class="summary-cards">
    <div class="card red">
      <div class="card-label">ไม่ครบ</div>
      <div class="card-value">${allShort.length} รายการ</div>
    </div>
    <div class="card amber">
      <div class="card-label">เกิน</div>
      <div class="card-value">${allOver.length} รายการ</div>
    </div>
  </div>

  ${allShort.length > 0 ? `
  <h2 class="red">⚠ รายการที่นับไม่ครบ (${allShort.length} รายการ)</h2>
  <table>
    <thead><tr><th>สินค้า / Serial</th><th style="text-align:center">จำนวน</th><th style="text-align:right">ผลต่าง</th></tr></thead>
    <tbody>${buildRows(allShort, 'short')}</tbody>
  </table>` : ''}

  ${allOver.length > 0 ? `
  <h2 class="amber">↑ รายการที่นับเกิน (${allOver.length} รายการ)</h2>
  <table>
    <thead><tr><th>สินค้า / Serial</th><th style="text-align:center">จำนวน</th><th style="text-align:right">ผลต่าง</th></tr></thead>
    <tbody>${buildRows(allOver, 'over')}</tbody>
  </table>` : ''}

</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}

// ── Serial Detail ─────────────────────────────────────────────────────────────
// แสดง serial ที่ขาด (อยู่ในระบบแต่ไม่ถูกสแกน) และ serial ที่สแกนได้
function SerialDetail({ h, items }) {
  const [show, setShow] = useState(false)
  const item = items.find(i => (i._id || i.id) === h.itemId)
  if (!item?.serials?.length) return null

  const allSerials = item.serials
  // สแกนได้ = quantityAfter ตัวแรก (เรียงตามลำดับ)
  // เนื่องจากไม่มีข้อมูลว่า serial ไหนสแกนได้จาก history โดยตรง
  // เราแสดง serial ทั้งหมดในระบบพร้อมจำนวนที่นับ vs ระบบ
  const diff = h.quantityBefore - h.quantityAfter // จำนวนที่ขาด (short) หรือ after - before (over)
  const isShort = h.quantityAfter < h.quantityBefore

  return (
    <div className="mt-2">
      <button
        onClick={() => setShow(p => !p)}
        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
      >
        {show ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        ดู Serial ในระบบ ({allSerials.length} ชิ้น)
      </button>
      {show && (
        <div className="mt-2 p-2 bg-slate-900/50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1.5">
            {isShort
              ? `ระบบมี ${allSerials.length} serial · นับได้ ${h.quantityAfter} · ขาด ${Math.abs(diff)} ชิ้น`
              : `ระบบมี ${allSerials.length} serial · นับได้ ${h.quantityAfter} · เกิน ${Math.abs(h.quantityAfter - h.quantityBefore)} ชิ้น`
            }
          </p>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {allSerials.map(s => (
              <span key={s} className="text-xs font-mono bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CountSummary() {
  const { history } = useHistory()
  const { items } = useStock()
  const [expandedCat, setExpandedCat] = useState(null)
  const [filterDate, setFilterDate] = useState('today')
  const [filterUser, setFilterUser] = useState('all')

  const countHistory = history.filter(h => h.type === 'update')

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
    return true
  }).filter(h => filterUser === 'all' || h.counter === filterUser)

  const users = [...new Set(countHistory.map(h => h.counter))].filter(Boolean)

  const catSummary = useMemo(() => {
    const summary = {}
    filtered.forEach(h => {
      const cat = h.category || 'unknown'
      if (!summary[cat]) summary[cat] = { short: [], over: [], match: [] }
      const diff = h.quantityAfter - h.quantityBefore
      if (diff < 0) summary[cat].short.push(h)
      else if (diff > 0) summary[cat].over.push(h)
      else summary[cat].match.push(h)
    })
    return summary
  }, [filtered])

  const allShort = filtered.filter(h => h.quantityAfter < h.quantityBefore)
  const allOver  = filtered.filter(h => h.quantityAfter > h.quantityBefore)
  const allMatch = filtered.filter(h => h.quantityAfter === h.quantityBefore)
  const totalDiff = allShort.reduce((s, h) => s + (h.quantityBefore - h.quantityAfter), 0)

  const hasIssues = allShort.length > 0 || allOver.length > 0

  // ── Empty state ───────────────────────────────────────────────
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
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">{filtered.length} รายการที่นับ</span>
          {/* ปุ่ม Export PDF — แสดงเฉพาะตอนมีรายการผิดปกติ */}
          {hasIssues && (
            <button
              onClick={() => exportPDF({ allShort, allOver, items, filterDate, filterUser })}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-sm font-medium transition-all"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </button>
          )}
        </div>
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
                      : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700/60 divide-y divide-slate-700/40">
                    {/* ไม่ครบ */}
                    {data.short.map(h => (
                      <div key={h.id} className="px-4 py-3 bg-red-500/5">
                        <div className="flex items-start gap-3">
                          <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white leading-tight">{h.itemName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{h.subcategory}</p>
                            <SerialDetail h={h} items={items} />
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
                      </div>
                    ))}
                    {/* เกิน */}
                    {data.over.map(h => (
                      <div key={h.id} className="px-4 py-3 bg-amber-500/5">
                        <div className="flex items-start gap-3">
                          <TrendingUp className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white leading-tight">{h.itemName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{h.subcategory}</p>
                            <SerialDetail h={h} items={items} />
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

      {/* รายการไม่ครบ — แสดง serial */}
      {allShort.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            รายการที่ไม่ครบ ({allShort.length} รายการ · ขาดรวม {totalDiff} ชิ้น)
          </h3>
          <div className="bg-slate-800 border border-red-500/20 rounded-2xl overflow-hidden">
            {allShort.map((h, i) => (
              <div key={h.id} className={`px-4 py-3 ${i > 0 ? 'border-t border-slate-700/60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-tight">{h.itemName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {categories[h.category]?.name || h.category} › {h.subcategory}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> {h.counter} · {formatDateTime(h.timestamp)}
                    </p>
                    {/* Serial detail */}
                    <SerialDetail h={h} items={items} />
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* รายการเกิน — แสดง serial */}
      {allOver.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            รายการที่เกิน ({allOver.length} รายการ)
          </h3>
          <div className="bg-slate-800 border border-amber-500/20 rounded-2xl overflow-hidden">
            {allOver.map((h, i) => (
              <div key={h.id} className={`px-4 py-3 ${i > 0 ? 'border-t border-slate-700/60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-tight">{h.itemName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {categories[h.category]?.name || h.category} › {h.subcategory}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> {h.counter} · {formatDateTime(h.timestamp)}
                    </p>
                    {/* Serial detail */}
                    <SerialDetail h={h} items={items} />
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ครบทุกรายการ */}
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
