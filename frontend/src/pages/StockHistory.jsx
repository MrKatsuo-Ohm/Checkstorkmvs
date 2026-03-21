import React, { useState } from 'react'
import { ClipboardList, User, ArrowUp, ArrowDown, Minus, Plus, Search, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useHistory } from '../context/HistoryContext'
import { categories } from '../utils/constants'

function formatDateTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function QtyDiff({ before, after }) {
  const diff = after - before
  if (diff === 0) return <span className="text-slate-400">{after} (ไม่เปลี่ยน)</span>
  return (
    <span className="flex items-center gap-1">
      <span className="text-slate-300">{before}</span>
      <span className="text-slate-500">→</span>
      <span className={diff > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{after}</span>
      <span className={`flex items-center text-xs ml-1 ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {diff > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        {Math.abs(diff)}
      </span>
    </span>
  )
}

// แสดง serial ที่ขาด (missingSerials)
function MissingSerials({ entry }) {
  const [show, setShow] = useState(false)
  const missing = entry.missingSerials || []
  const isShort = entry.quantityAfter < entry.quantityBefore

  if (!isShort || missing.length === 0) return null

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setShow(p => !p)}
        className="flex items-center gap-1 text-xs text-red-400/80 hover:text-red-300 transition-colors"
      >
        {show ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Serial ที่ไม่พบ ({missing.length} ชิ้น)
      </button>
      {show && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {missing.map(s => (
            <span key={s} className="text-xs font-mono bg-red-500/10 border border-red-500/30 text-red-300 px-1.5 py-0.5 rounded">
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StockHistory() {
  const { history, clearHistory } = useHistory()
  const [filterUser, setFilterUser] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')

  const users = [...new Set(history.map(h => h.counter))].filter(Boolean)

  let filtered = [...history]
  if (filterUser !== 'all') filtered = filtered.filter(h => h.counter === filterUser)
  if (filterType !== 'all') filtered = filtered.filter(h => h.type === filterType)
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(h =>
      h.itemName.toLowerCase().includes(q) ||
      h.counter.toLowerCase().includes(q) ||
      (h.note || '').toLowerCase().includes(q)
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
          ประวัติการนับสต๊อก
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">{filtered.length} รายการ</span>
          {history.length > 0 && (
            <button
              onClick={() => { if (window.confirm('ล้างประวัติทั้งหมด?')) clearHistory() }}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ล้างประวัติ</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 md:gap-3">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">ทุกคน</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">ทุกประเภท</option>
          <option value="create">เพิ่มใหม่</option>
          <option value="update">แก้ไข</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
            <ClipboardList className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-slate-400">
            {history.length === 0 ? 'ยังไม่มีประวัติการนับสต๊อก' : 'ไม่พบรายการที่ค้นหา'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="md:hidden space-y-3">
            {filtered.map((entry) => {
              const cat = categories[entry.category]
              const isShort = entry.quantityAfter < entry.quantityBefore
              return (
                <div key={entry.id || entry._id}
                  className={`bg-slate-800 border rounded-2xl p-4 space-y-2 ${
                    isShort ? 'border-red-500/20' : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">{entry.itemName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{cat?.name} › {entry.subcategory}</p>
                    </div>
                    {entry.type === 'create' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium shrink-0">
                        <Plus className="w-3 h-3" /> เพิ่มใหม่
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium shrink-0 ${
                        isShort ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        <Minus className="w-3 h-3" /> {isShort ? 'ไม่ครบ' : 'แก้ไข'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-300">{entry.counter}</span>
                    </span>
                    <span>{formatDateTime(entry.timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <QtyDiff before={entry.quantityBefore} after={entry.quantityAfter} />
                    {entry.note && <span className="text-slate-400 text-xs truncate max-w-[120px]">{entry.note}</span>}
                  </div>
                  {/* Serial ที่ขาด */}
                  <MissingSerials entry={entry} />
                </div>
              )
            })}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700/50 text-slate-300">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">วันเวลา</th>
                    <th className="text-left py-3 px-4 font-medium">ผู้นับสต๊อก</th>
                    <th className="text-left py-3 px-4 font-medium">สินค้า</th>
                    <th className="text-left py-3 px-4 font-medium">ประเภท</th>
                    <th className="text-left py-3 px-4 font-medium">จำนวน / Serial ที่ขาด</th>
                    <th className="text-left py-3 px-4 font-medium">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => {
                    const cat = categories[entry.category]
                    const isShort = entry.quantityAfter < entry.quantityBefore
                    return (
                      <tr key={entry.id || entry._id}
                        className={`border-t border-slate-700/60 hover:bg-slate-700/30 transition-colors ${
                          isShort ? 'bg-red-500/3' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{formatDateTime(entry.timestamp)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <span className="font-medium text-blue-300">{entry.counter}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-white">{entry.itemName}</p>
                          <p className="text-slate-500 text-xs">{cat?.name} › {entry.subcategory}</p>
                        </td>
                        <td className="py-3 px-4">
                          {entry.type === 'create' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium">
                              <Plus className="w-3 h-3" /> เพิ่มใหม่
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                              isShort ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              <Minus className="w-3 h-3" /> {isShort ? 'ไม่ครบ' : 'แก้ไข'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <QtyDiff before={entry.quantityBefore} after={entry.quantityAfter} />
                          <MissingSerials entry={entry} />
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">
                          {entry.note || <span className="text-slate-600">—</span>}
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
