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

// ── คำนวณ serial ที่ขาด/เกิน ─────────────────────────────────────────────────
// missingSerials = เก็บจาก StockCount ตอนบันทึก (serial ในระบบที่ไม่ถูกสแกน)
// extraSerials   = serial ที่สแกนได้แต่ไม่มีในระบบ (ปกติจะว่างเพราะ StockCount กรองอยู่แล้ว)
function getSerialLists(h, items) {
  // ถ้ามีข้อมูลจาก StockCount โดยตรง → ใช้เลย
  if (h.missingSerials !== undefined || h.scannedSerials !== undefined) {
    return {
      missing: h.missingSerials || [],
      extra:   [],  // ระบบปัจจุบันไม่มี extra serial เพราะ scan จะ error ถ้าไม่อยู่ในระบบ
    }
  }
  // fallback: คำนวณจาก items (กรณีเป็น history เก่าก่อนอัปเดต)
  const item = items.find(i => (i._id || i.id) === h.itemId)
  if (!item?.serials?.length) return { missing: [], extra: [] }
  const diff = h.quantityBefore - h.quantityAfter
  if (diff <= 0) return { missing: [], extra: [] }
  // ไม่รู้ serial ไหนหายไปในข้อมูลเก่า → แสดงทั้งหมดแทน
  return { missing: item.serials, extra: [] }
}

// ── Serial Badge ──────────────────────────────────────────────────────────────
function SerialBadges({ serials, color }) {
  if (!serials?.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {serials.map(s => (
        <span
          key={s}
          className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
            color === 'red'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {s}
        </span>
      ))}
    </div>
  )
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportPDF({ allShort, allOver, items, filterDate, filterUser }) {
  const now = new Date().toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const buildRows = (list, type) => list.map(h => {
    const { missing, extra } = getSerialLists(h, items)
    const problemSerials = type === 'short' ? missing : extra
    const diff = type === 'short'
      ? h.quantityBefore - h.quantityAfter
      : h.quantityAfter - h.quantityBefore
    const color = type === 'short' ? '#ef4444' : '#f59e0b'
    const label = type === 'short'
      ? `<span style="color:${color}">ขาด ${diff} ชิ้น</span>`
      : `<span style="color:${color}">เกิน ${diff} ชิ้น</span>`

    const serialHTML = problemSerials.length > 0
      ? `<div style="margin-top:6px">
           <div style="font-size:11px;color:#94a3b8;margin-bottom:3px">
             ${type === 'short' ? 'Serial ที่ไม่พบ:' : 'Serial ที่เกิน:'}
           </div>
           <div style="display:flex;flex-wrap:wrap;gap:4px">
             ${problemSerials.map(s =>
               `<span style="font-family:monospace;font-size:11px;background:${type === 'short' ? '#fee2e2' : '#fef3c7'};border:1px solid ${type === 'short' ? '#fca5a5' : '#fde68a'};border-radius:4px;padding:1px 6px;color:${color}">${s}</span>`
             ).join('')}
           </div>
         </div>`
      : ''

    return `
      <tr>
        <td>
          <div style="font-weight:600;font-size:13px">${h.itemName}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">${categories[h.category]?.name || h.category} › ${h.subcategory}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">ผู้นับ: ${h.counter} · ${formatDateTime(h.timestamp)}</div>
          ${serialHTML}
        </td>
        <td style="text-align:center;white-space:nowrap;font-size:13px">
          <span style="color:#94a3b8">${h.quantityBefore}</span>
          <span style="color:#cbd5e1;margin:0 4px">→</span>
          <span style="color:${color};font-weight:700">${h.quantityAfter}</span>
        </td>
        <td style="text-align:right;white-space:nowrap;font-weight:700;font-size:13px">${label}</td>
      </tr>`
  }).join('')

  const periodLabel = { today: 'วันนี้', week: '7 วันล่าสุด', month: '30 วันล่าสุด', all: 'ทั้งหมด' }[filterDate] || filterDate
  const totalDiff = allShort.reduce((s, h) => s + (h.quantityBefore - h.quantityAfter), 0)

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8"/>
<title>รายงานสรุปการนับสต๊อก — รายการผิดปกติ</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun','Tahoma',sans-serif; font-size: 13px; color: #1e293b; padding: 28px; }
  h1 { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; }
  .cards { display: flex; gap: 12px; margin-bottom: 24px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; min-width: 120px; }
  .card.red { border-color: #fca5a5; background: #fff5f5; }
  .card.red .val { color: #ef4444; }
  .card.amber { border-color: #fde68a; background: #fffbeb; }
  .card.amber .val { color: #f59e0b; }
  .lbl { font-size: 11px; color: #94a3b8; margin-bottom: 2px; }
  .val { font-size: 20px; font-weight: 700; }
  h2 { font-size: 13px; font-weight: 700; padding: 5px 10px; border-radius: 6px; margin: 20px 0 8px; }
  h2.red { background: #fee2e2; color: #b91c1c; }
  h2.amber { background: #fef3c7; color: #92400e; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f8fafc; padding: 7px 10px; text-align: left; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
  td { padding: 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>รายงานสรุปการนับสต๊อก — รายการผิดปกติ</h1>
  <div class="meta">
    พิมพ์เมื่อ: ${now} ·
    ช่วงเวลา: ${periodLabel}
    ${filterUser !== 'all' ? ` · ผู้นับ: ${filterUser}` : ''}
  </div>

  <div class="cards">
    <div class="card red">
      <div class="lbl">ไม่ครบ</div>
      <div class="val">${allShort.length} รายการ</div>
      <div style="font-size:11px;color:#ef4444;margin-top:2px">ขาดรวม ${totalDiff} ชิ้น</div>
    </div>
    <div class="card amber">
      <div class="lbl">เกิน</div>
      <div class="val">${allOver.length} รายการ</div>
    </div>
  </div>

  ${allShort.length > 0 ? `
    <h2 class="red">⚠ รายการที่นับไม่ครบ — Serial ที่ไม่พบ (${allShort.length} รายการ)</h2>
    <table>
      <thead><tr>
        <th>สินค้า / Serial ที่ไม่พบ</th>
        <th style="text-align:center;width:100px">จำนวน</th>
        <th style="text-align:right;width:80px">ผลต่าง</th>
      </tr></thead>
      <tbody>${buildRows(allShort, 'short')}</tbody>
    </table>` : ''}

  ${allOver.length > 0 ? `
    <h2 class="amber">↑ รายการที่นับเกิน — Serial ที่เกิน (${allOver.length} รายการ)</h2>
    <table>
      <thead><tr>
        <th>สินค้า / Serial ที่เกิน</th>
        <th style="text-align:center;width:100px">จำนวน</th>
        <th style="text-align:right;width:80px">ผลต่าง</th>
      </tr></thead>
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

  const allShort  = filtered.filter(h => h.quantityAfter < h.quantityBefore)
  const allOver   = filtered.filter(h => h.quantityAfter > h.quantityBefore)
  const allMatch  = filtered.filter(h => h.quantityAfter === h.quantityBefore)
  const totalDiff = allShort.reduce((s, h) => s + (h.quantityBefore - h.quantityAfter), 0)
  const hasIssues = allShort.length > 0 || allOver.length > 0

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
                    {!hasIssues && (
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
                    {data.short.map(h => {
                      const { missing } = getSerialLists(h, items)
                      return (
                        <div key={h.id} className="px-4 py-3 bg-red-500/5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                <p className="text-sm font-medium text-white leading-tight">{h.itemName}</p>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 ml-5">{h.subcategory}</p>
                              {/* Serial ที่ไม่พบ */}
                              {missing.length > 0 && (
                                <div className="mt-2 ml-5">
                                  <p className="text-xs text-red-400/70 mb-1">Serial ที่ไม่พบ ({missing.length} ชิ้น):</p>
                                  <SerialBadges serials={missing} color="red" />
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm">
                                <span className="text-slate-400">{h.quantityBefore}</span>
                                <span className="text-slate-600 mx-1">→</span>
                                <span className="text-red-400 font-bold">{h.quantityAfter}</span>
                              </p>
                              <p className="text-xs text-red-400 font-semibold">ขาด {h.quantityBefore - h.quantityAfter} ชิ้น</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
                          <p className="text-xs text-amber-400 font-semibold">เกิน {h.quantityAfter - h.quantityBefore} ชิ้น</p>
                        </div>
                      </div>
                    ))}
                    {data.match.map(h => (
                      <div key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                        <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0" />
                        <p className="text-sm text-slate-400 leading-tight truncate flex-1">{h.itemName}</p>
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

      {/* รายการไม่ครบ */}
      {allShort.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            รายการที่ไม่ครบ ({allShort.length} รายการ · ขาดรวม {totalDiff} ชิ้น)
          </h3>
          <div className="bg-slate-800 border border-red-500/20 rounded-2xl overflow-hidden">
            {allShort.map((h, i) => {
              const { missing } = getSerialLists(h, items)
              return (
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
                      {/* Serial ที่ไม่พบ เท่านั้น */}
                      {missing.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-red-400/70 mb-1">
                            Serial ที่ไม่พบ ({missing.length} ชิ้น):
                          </p>
                          <SerialBadges serials={missing} color="red" />
                        </div>
                      )}
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
              )
            })}
          </div>
        </div>
      )}

      {/* รายการเกิน */}
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
      {filtered.length > 0 && !hasIssues && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-400 font-semibold">สต๊อกตรงกันทุกรายการ 🎉</p>
          <p className="text-slate-400 text-sm mt-1">จำนวนที่นับตรงกับระบบทั้งหมด</p>
        </div>
      )}
    </div>
  )
}
