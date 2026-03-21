import React, { useState, useRef } from 'react'
import { Upload, Download, CheckCircle2, XCircle, AlertTriangle, Plus, Trash2, FileSpreadsheet } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { useHistory } from '../context/HistoryContext'
import { useUser } from '../context/UserContext'
import { categories } from '../utils/constants'

// ── Download Template ─────────────────────────────────────────────────────────
function downloadTemplate() {
  const headers = ['ชื่อสินค้า*', 'รหัสสินค้า', 'หมวดหมู่*', 'หมวดย่อย*', 'จำนวน*', 'ราคา*', 'Serial (คั่นด้วย |)', 'ตำแหน่ง', 'หมายเหตุ']
  const examples = [
    ['CPU AMD RYZEN 5 5600', '1004000001', 'hardware', 'CPU', '3', '3500', 'SN001|SN002|SN003', 'ชั้น A-01', ''],
    ['เมาส์ LOGITECH G304', '2001000001', 'peripheral', 'เมาส์', '10', '890', '', 'ชั้น B-02', 'ไร้สาย'],
    ['SSD SAMSUNG 970 EVO 500GB', '1004000002', 'hardware', 'SSD M.2', '5', '2200', 'MZ-V7E500BW001|MZ-V7E500BW002', '', ''],
  ]
  const catInfo = Object.entries(categories).map(([k, v]) => `${k} = ${v.name}`).join('\n')
  const csv = [
    '# IT Stock Manager — Template นำเข้าสินค้า',
    '# หมวดหมู่ที่ใช้ได้: ' + Object.keys(categories).join(', '),
    '# Serial หลายตัว: คั่นด้วย | เช่น SN001|SN002|SN003',
    '#',
    headers.join(','),
    ...examples.map(r => r.map(c => `"${c}"`).join(','))
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Parse CSV/Excel-style ─────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'))
  if (lines.length < 2) return { headers: [], rows: [] }

  const parseRow = (line) => {
    const cols = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ }
      else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += c
    }
    cols.push(cur.trim())
    return cols
  }

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[*\s]/g, ''))
  const rows = lines.slice(1).map(l => {
    const cols = parseRow(l)
    const obj = {}
    headers.forEach((h, i) => obj[h] = cols[i] || '')
    return obj
  })
  return { headers, rows }
}

// ── Map row → item ────────────────────────────────────────────────────────────
function mapRow(row, idx) {
  const errors = []

  // หาชื่อ field แบบ flexible
  const get = (...keys) => {
    for (const k of keys) {
      const val = row[k] || row[k.replace(/[*]/g, '')] || ''
      if (val) return val.trim()
    }
    return ''
  }

  const name     = get('ชื่อสินค้า', 'name', 'สินค้า', 'product')
  const code     = get('รหัสสินค้า', 'product_code', 'code', 'รหัส')
  const catKey   = get('หมวดหมู่', 'category', 'cat')
  const subcat   = get('หมวดย่อย', 'subcategory', 'sub', 'หมวดย่อย')
  const qty      = parseInt(get('จำนวน', 'quantity', 'qty')) || 0
  const price    = parseFloat(get('ราคา', 'price')) || 0
  const serialRaw = get('serial(คั่นด้วย|)', 'serial', 'serials', 'serial number')
  const location = get('ตำแหน่ง', 'location')
  const notes    = get('หมายเหตุ', 'notes', 'note')

  if (!name) errors.push('ไม่มีชื่อสินค้า')
  if (!catKey || !categories[catKey]) errors.push(`หมวดหมู่ "${catKey}" ไม่ถูกต้อง`)
  if (catKey && categories[catKey] && subcat && !categories[catKey]?.subcategories.includes(subcat)) {
    errors.push(`หมวดย่อย "${subcat}" ไม่อยู่ในหมวด "${catKey}"`)
  }

  const serials = serialRaw ? serialRaw.split('|').map(s => s.trim()).filter(Boolean) : []
  const finalQty = serials.length > 0 ? serials.length : qty

  return {
    item: {
      name, product_code: code,
      category: catKey || 'misc',
      subcategory: subcat || (categories[catKey]?.subcategories[0] || ''),
      quantity: finalQty, price,
      serials, location, notes
    },
    errors,
    rowNum: idx + 2
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ImportForm({ onSuccess }) {
  const { createItem } = useStock()
  const { addHistoryEntry } = useHistory()
  const { currentUser } = useUser()
  const fileRef = useRef()

  const [stage, setStage] = useState('upload') // upload | preview | importing | done
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [importing, setImporting] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [fileName, setFileName] = useState('')

  const validRows   = rows.filter(r => r.errors.length === 0)
  const invalidRows = rows.filter(r => r.errors.length > 0)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const { rows: parsed } = parseCSV(text)
      const mapped = parsed.map((r, i) => mapRow(r, i))
      setRows(mapped)
      setSelected(new Set(mapped.filter(r => r.errors.length === 0).map((_, i) => i)))
      setStage('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) { fileRef.current.files = e.dataTransfer.files; handleFile({ target: { files: [file] } }) }
  }

  const toggleRow = (i) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else if (rows[i].errors.length === 0) next.add(i)
      return next
    })
  }

  const handleImport = async () => {
    setImporting(true)
    setStage('importing')
    let count = 0
    for (const i of selected) {
      const { item } = rows[i]
      const ok = await createItem(item)
      if (ok) {
        addHistoryEntry({
          type: 'create',
          itemName: item.name,
          category: item.category,
          subcategory: item.subcategory,
          quantityBefore: 0,
          quantityAfter: item.quantity,
          priceBefore: 0,
          priceAfter: item.price,
          counter: currentUser?.name || 'ไม่ระบุ',
          note: 'นำเข้าจาก Excel/CSV'
        })
        count++
      }
    }
    setDoneCount(count)
    setImporting(false)
    setStage('done')
  }

  // ── Upload stage ──
  if (stage === 'upload') return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
        นำเข้าสินค้าจาก Excel / CSV
      </h2>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current.click()}
        className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-slate-800/50"
      >
        <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <p className="text-white font-medium mb-1">คลิกเพื่อเลือกไฟล์ หรือลากมาวางตรงนี้</p>
        <p className="text-slate-400 text-sm">รองรับ .csv (UTF-8)</p>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
      </div>

      {/* Download template */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">ดาวน์โหลด Template</p>
          <p className="text-slate-400 text-sm mt-0.5">ไฟล์ตัวอย่างพร้อมคำอธิบายทุก column</p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-medium transition-all shrink-0">
          <Download className="w-4 h-4" /> ดาวน์โหลด
        </button>
      </div>

      {/* Format guide */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3">
        <p className="font-medium text-sm">Format ของไฟล์ CSV</p>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="bg-slate-700/50">
                {['ชื่อสินค้า*', 'รหัสสินค้า', 'หมวดหมู่*', 'หมวดย่อย*', 'จำนวน*', 'ราคา*', 'Serial', 'ตำแหน่ง', 'หมายเหตุ'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-slate-300 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {['CPU AMD RYZEN 5', '1004000001', 'hardware', 'CPU', '3', '3500', 'SN001|SN002|SN003', 'ชั้น A-01', ''].map((v, i) => (
                  <td key={i} className="px-3 py-2 text-slate-400 font-mono whitespace-nowrap">{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">* = จำเป็น · Serial หลายตัวคั่นด้วย | เช่น SN001|SN002</p>
        <div className="text-xs text-slate-500 space-y-0.5">
          <p className="font-medium text-slate-400 mb-1">หมวดหมู่ที่ใช้ได้:</p>
          {Object.entries(categories).map(([k, v]) => (
            <p key={k}><span className="text-blue-400 font-mono">{k}</span> = {v.name}</p>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Preview stage ──
  if (stage === 'preview') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          Preview — {fileName}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            เลือก {selected.size} / {validRows.length} รายการ
          </span>
          <button onClick={() => { setStage('upload'); setRows([]); setFileName('') }}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm transition-colors">
            เปลี่ยนไฟล์
          </button>
          <button onClick={handleImport} disabled={selected.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium transition-colors disabled:opacity-40">
            <Plus className="w-4 h-4" /> Import {selected.size} รายการ
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 font-medium">{validRows.length}</span>
          <span className="text-slate-400">รายการพร้อม import</span>
        </div>
        {invalidRows.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-medium">{invalidRows.length}</span>
            <span className="text-slate-400">รายการมี error</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-700/50 text-slate-300">
              <tr>
                <th className="w-10 py-3 px-3">
                  <input type="checkbox"
                    checked={selected.size === validRows.length && validRows.length > 0}
                    onChange={e => setSelected(e.target.checked ? new Set(rows.map((_, i) => i).filter(i => rows[i].errors.length === 0)) : new Set())}
                    className="rounded" />
                </th>
                <th className="text-left py-3 px-3 font-medium">แถว</th>
                <th className="text-left py-3 px-3 font-medium">ชื่อสินค้า</th>
                <th className="text-left py-3 px-3 font-medium">หมวด</th>
                <th className="text-center py-3 px-3 font-medium">จำนวน</th>
                <th className="text-right py-3 px-3 font-medium">ราคา</th>
                <th className="text-center py-3 px-3 font-medium">Serial</th>
                <th className="text-left py-3 px-3 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isValid = r.errors.length === 0
                const isSelected = selected.has(i)
                return (
                  <tr key={i}
                    onClick={() => isValid && toggleRow(i)}
                    className={`border-t border-slate-700/50 transition-colors ${
                      isValid ? 'cursor-pointer hover:bg-slate-700/30' : 'opacity-60'
                    } ${isSelected ? 'bg-blue-500/5' : ''}`}
                  >
                    <td className="py-3 px-3">
                      {isValid && (
                        <input type="checkbox" checked={isSelected} onChange={() => toggleRow(i)} className="rounded" onClick={e => e.stopPropagation()} />
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-xs">{r.rowNum}</td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-white truncate max-w-[180px]">{r.item.name || '—'}</p>
                      {r.item.product_code && <p className="text-xs text-slate-500 font-mono">{r.item.product_code}</p>}
                    </td>
                    <td className="py-3 px-3 text-slate-300 text-xs">
                      <p>{categories[r.item.category]?.name || r.item.category}</p>
                      <p className="text-slate-500">{r.item.subcategory}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-medium">{r.item.quantity}</td>
                    <td className="py-3 px-3 text-right text-emerald-400">฿{r.item.price.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center text-xs text-slate-400">
                      {r.item.serials.length > 0 ? <span className="text-blue-400">{r.item.serials.length} ชิ้น</span> : '—'}
                    </td>
                    <td className="py-3 px-3">
                      {isValid ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> พร้อม
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          {r.errors.map((e, j) => (
                            <p key={j} className="flex items-center gap-1 text-red-400 text-xs">
                              <AlertTriangle className="w-3 h-3 shrink-0" /> {e}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // ── Importing stage ──
  if (stage === 'importing') return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-white font-medium">กำลัง import สินค้า...</p>
      <p className="text-slate-400 text-sm">กรุณารอสักครู่</p>
    </div>
  )

  // ── Done stage ──
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      </div>
      <h3 className="text-2xl font-bold text-white">Import สำเร็จ!</h3>
      <p className="text-slate-400">เพิ่มสินค้าเข้าระบบแล้ว <span className="text-white font-bold">{doneCount}</span> รายการ</p>
      <div className="flex gap-3 mt-2">
        <button onClick={() => { setStage('upload'); setRows([]); setFileName('') }}
          className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors">
          Import เพิ่ม
        </button>
        <button onClick={onSuccess}
          className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl font-medium transition-colors">
          ไปที่คลังสินค้า
        </button>
      </div>
    </div>
  )
}
