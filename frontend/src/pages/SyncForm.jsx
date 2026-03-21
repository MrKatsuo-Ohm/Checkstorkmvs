import React, { useState, useRef } from 'react'
import { RefreshCw, Download, CheckCircle2, XCircle, AlertTriangle, Plus, Trash2, ArrowRight, FileSpreadsheet } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { categories } from '../utils/constants'

// reuse parseCSV และ mapRow จาก ImportForm
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'))
  if (lines.length < 2) return []
  const parseRow = (line) => {
    const cols = []; let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') inQ = !inQ
      else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += c
    }
    cols.push(cur.trim())
    return cols
  }
  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[*\s]/g, ''))
  return lines.slice(1).map(l => {
    const cols = parseRow(l)
    const obj = {}
    headers.forEach((h, i) => obj[h] = cols[i] || '')
    return obj
  })
}

function mapRow(row) {
  const get = (...keys) => { for (const k of keys) { const v = row[k] || ''; if (v) return v.trim() } return '' }
  const name     = get('ชื่อสินค้า', 'name', 'สินค้า')
  const code     = get('รหัสสินค้า', 'product_code', 'code', 'รหัส')
  const catKey   = get('หมวดหมู่', 'category', 'cat')
  const subcat   = get('หมวดย่อย', 'subcategory', 'sub')
  const qty      = parseInt(get('จำนวน', 'quantity', 'qty')) || 0
  const price    = parseFloat(get('ราคา', 'price')) || 0
  const serialRaw = get('serial(คั่นด้วย|)', 'serial', 'serials')
  const location = get('ตำแหน่ง', 'location')
  const notes    = get('หมายเหตุ', 'notes')
  const serials  = serialRaw ? serialRaw.split('|').map(s => s.trim()).filter(Boolean) : []
  const errors   = []
  if (!name) errors.push('ไม่มีชื่อสินค้า')
  if (!code) errors.push('ไม่มีรหัสสินค้า (จำเป็นสำหรับ sync)')
  if (!catKey || !categories[catKey]) errors.push(`หมวดหมู่ "${catKey}" ไม่ถูกต้อง`)
  return {
    item: { name, product_code: code, category: catKey || 'misc', subcategory: subcat || (categories[catKey]?.subcategories[0] || ''), quantity: serials.length || qty, price, serials, location, notes },
    errors
  }
}

export default function SyncForm({ onSuccess }) {
  const { items, fetchItems } = useStock()
  const fileRef = useRef()
  const [stage, setStage] = useState('upload')
  const [fileRows, setFileRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result)
      setFileRows(rows.map(r => mapRow(r)))
      setStage('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  // คำนวณ diff
  const validRows  = fileRows.filter(r => r.errors.length === 0)
  const fileCodes  = new Set(validRows.map(r => r.item.product_code).filter(Boolean))
  const sysItems   = items
  const sysCodes   = new Set(sysItems.map(i => i.product_code).filter(Boolean))

  const toAdd    = validRows.filter(r => r.item.product_code && !sysCodes.has(r.item.product_code))
  const toUpdate = validRows.filter(r => r.item.product_code && sysCodes.has(r.item.product_code))
  const toDelete = sysItems.filter(i => i.product_code && !fileCodes.has(i.product_code))

  const handleSync = async () => {
    setSyncing(true)
    setStage('syncing')
    try {
      const res = await fetch('/api/stock/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validRows.map(r => r.item) })
      })
      const data = await res.json()
      await fetchItems() // reload items
      setResult(data)
      setStage('done')
    } catch (err) {
      setResult({ error: err.message })
      setStage('done')
    }
    setSyncing(false)
  }

  // ── Upload ──
  if (stage === 'upload') return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-amber-400" />
          Sync สต็อกจากไฟล์
        </h2>
        <p className="text-slate-400 text-sm mt-1">อัปโหลดไฟล์ CSV เพื่อ sync ข้อมูลทั้งหมดให้ตรงกับไฟล์</p>
      </div>

      {/* คำเตือน */}
      <div className="flex gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-300">ข้อควรระวัง</p>
          <p className="text-slate-400 mt-1">สินค้าที่มีรหัสสินค้าในระบบแต่ <span className="text-white">ไม่มีในไฟล์จะถูกลบออก</span> ไม่สามารถกู้คืนได้ ควร preview ก่อนเสมอ</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current.click()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { fileRef.current.files = e.dataTransfer.files; handleFile({ target: { files: [f] } }) } }}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-slate-600 hover:border-amber-500 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-slate-800/50"
      >
        <RefreshCw className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <p className="text-white font-medium mb-1">คลิกเพื่อเลือกไฟล์ หรือลากมาวางตรงนี้</p>
        <p className="text-slate-400 text-sm">ใช้ format เดียวกับ Import (.csv) — ต้องมีรหัสสินค้า</p>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
      </div>

      <p className="text-xs text-slate-500 text-center">
        ไม่มีไฟล์? ใช้ปุ่ม <span className="text-slate-400 font-medium">ดาวน์โหลด Template</span> จากหน้า Import Excel/CSV ก่อนครับ
      </p>
    </div>
  )

  // ── Preview ──
  if (stage === 'preview') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-amber-400" />
          Preview การ Sync — {fileName}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => { setStage('upload'); setFileRows([]) }}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm transition-colors">
            เปลี่ยนไฟล์
          </button>
          <button onClick={handleSync} disabled={validRows.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-40">
            <RefreshCw className="w-4 h-4" /> ยืนยัน Sync
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">เพิ่มใหม่</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{toAdd.length}</p>
          <p className="text-xs text-slate-500">รายการ</p>
        </div>
        <div className="bg-slate-800 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">อัปเดต</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{toUpdate.length}</p>
          <p className="text-xs text-slate-500">รายการ</p>
        </div>
        <div className="bg-slate-800 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trash2 className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-400">ลบออก</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{toDelete.length}</p>
          <p className="text-xs text-slate-500">รายการ</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-400">Error</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{fileRows.filter(r => r.errors.length > 0).length}</p>
          <p className="text-xs text-slate-500">แถวมีปัญหา</p>
        </div>
      </div>

      {/* สินค้าที่จะถูกลบ — แสดงชัดๆ */}
      {toDelete.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> สินค้าที่จะถูกลบออก ({toDelete.length} รายการ)
          </p>
          <div className="flex flex-wrap gap-2">
            {toDelete.map(i => (
              <span key={i.id || i._id} className="text-xs bg-red-500/10 border border-red-500/20 text-red-300 px-2 py-1 rounded-lg">
                {i.product_code} — {i.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* สินค้าที่จะเพิ่ม */}
      {toAdd.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
            <Plus className="w-4 h-4" /> สินค้าที่จะเพิ่มใหม่ ({toAdd.length} รายการ)
          </p>
          <div className="flex flex-wrap gap-2">
            {toAdd.map((r, i) => (
              <span key={i} className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg">
                {r.item.product_code} — {r.item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error rows */}
      {fileRows.some(r => r.errors.length > 0) && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-400">⚠ แถวที่มีปัญหา (จะไม่ถูก sync)</p>
          {fileRows.filter(r => r.errors.length > 0).map((r, i) => (
            <div key={i} className="text-xs text-red-400">
              <span className="text-slate-300">{r.item.name || '?'}</span>: {r.errors.join(', ')}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Syncing ──
  if (stage === 'syncing') return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-white font-medium">กำลัง sync ข้อมูล...</p>
      <p className="text-slate-400 text-sm">กรุณารอสักครู่</p>
    </div>
  )

  // ── Done ──
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      {result?.error ? (
        <>
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">เกิดข้อผิดพลาด</h3>
          <p className="text-red-400 text-sm">{result.error}</p>
        </>
      ) : (
        <>
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">Sync สำเร็จ!</h3>
          <div className="flex gap-6 text-sm">
            <div><p className="text-2xl font-bold text-emerald-400">{result?.added || 0}</p><p className="text-slate-400">เพิ่มใหม่</p></div>
            <div><p className="text-2xl font-bold text-blue-400">{result?.updated || 0}</p><p className="text-slate-400">อัปเดต</p></div>
            <div><p className="text-2xl font-bold text-red-400">{result?.deleted || 0}</p><p className="text-slate-400">ลบออก</p></div>
          </div>
        </>
      )}
      <div className="flex gap-3 mt-2">
        <button onClick={() => { setStage('upload'); setFileRows([]); setResult(null) }}
          className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors">
          Sync ใหม่
        </button>
        <button onClick={onSuccess}
          className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl font-medium transition-colors">
          ไปที่คลังสินค้า
        </button>
      </div>
    </div>
  )
}
