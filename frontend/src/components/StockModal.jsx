import React, { useState, useEffect } from 'react'
import { X, Save, User, Plus, Trash2, Tag } from 'lucide-react'
import { categories } from '../utils/constants'
import { useStock } from '../context/StockContext'
import { useUser } from '../context/UserContext'
import { useHistory } from '../context/HistoryContext'

export default function StockModal({ item, onClose }) {
  const { createItem, updateItem, loading } = useStock()
  const { currentUser } = useUser()
  const { addHistoryEntry } = useHistory()
  const isEdit = !!item

  const [form, setForm] = useState({
    name: '', category: 'hardware', subcategory: '',
    product_code: '', quantity: '', price: '', location: '', notes: ''
  })
  const [serials, setSerials] = useState([])
  const [newSerial, setNewSerial] = useState('')
  const [countNote, setCountNote] = useState('')

  useEffect(() => {
    if (item) {
      setForm({ ...item })
      setSerials(item.serials || [])
    } else {
      const firstCat = 'hardware'
      setForm(f => ({ ...f, category: firstCat, subcategory: categories[firstCat].subcategories[0] }))
      setSerials([])
    }
  }, [item])

  useEffect(() => {
    if (form.category && !item) {
      setForm(f => ({ ...f, subcategory: categories[form.category]?.subcategories[0] || '' }))
    }
  }, [form.category, item])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleAddSerial = () => {
    const codes = newSerial.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean)
    const unique = codes.filter(c => !serials.includes(c))
    if (unique.length > 0) {
      setSerials(prev => [...prev, ...unique])
      setForm(f => ({ ...f, quantity: String([...serials, ...unique].length) }))
    }
    setNewSerial('')
  }

  const handleRemoveSerial = (s) => {
    const next = serials.filter(x => x !== s)
    setSerials(next)
    setForm(f => ({ ...f, quantity: String(next.length) }))
  }

  const handleSerialKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddSerial() }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      quantity: parseInt(form.quantity) || 0,
      price: parseFloat(form.price) || 0,
      serials,
    }

    let ok
    if (isEdit) {
      ok = await updateItem(item.id || item._id, payload)
      if (ok) {
        addHistoryEntry({
          type: 'update',
          itemId: item.id || item._id,
          itemName: payload.name,
          category: payload.category,
          subcategory: payload.subcategory,
          quantityBefore: item.quantity,
          quantityAfter: payload.quantity,
          priceBefore: item.price,
          priceAfter: payload.price,
          counter: currentUser?.name || 'ไม่ระบุ',
          note: countNote || ''
        })
      }
    } else {
      ok = await createItem(payload)
      if (ok) {
        addHistoryEntry({
          type: 'create',
          itemName: payload.name,
          category: payload.category,
          subcategory: payload.subcategory,
          quantityBefore: 0,
          quantityAfter: payload.quantity,
          priceBefore: 0,
          priceAfter: payload.price,
          counter: currentUser?.name || 'ไม่ระบุ',
          note: countNote || ''
        })
      }
    }
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
          <h3 className="text-xl font-bold">{isEdit ? 'แก้ไข / นับสต๊อก' : 'เพิ่มสินค้าใหม่'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm">
            <User className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-slate-300">ผู้นับสต๊อก:</span>
            <span className="text-blue-300 font-medium">{currentUser?.name || 'ไม่ระบุ'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* รหัส + ชื่อ */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">รหัสสินค้า</label>
              <input name="product_code" value={form.product_code || ''} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono text-sm"
                placeholder="เช่น 1004000031" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">ชื่อสินค้า *</label>
              <input name="name" required value={form.name} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="เช่น CPU AMD AM4 RYZEN 5 5600" />
            </div>
          </div>

          {/* หมวดหมู่ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">หมวดหมู่ *</label>
              <select name="category" required value={form.category} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white">
                {Object.entries(categories).map(([key, cat]) => (
                  <option key={key} value={key}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">หมวดหมู่ย่อย *</label>
              <select name="subcategory" required value={form.subcategory} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white">
                {(categories[form.category]?.subcategories || []).map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ราคา + ตำแหน่ง */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">ราคา (บาท) *</label>
              <input name="price" type="number" min="0" step="0.01" required value={form.price} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">ตำแหน่ง</label>
              <input name="location" value={form.location || ''} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="เช่น ชั้น A-01" />
            </div>
          </div>

          {/* ── Serial Management ── */}
          <div className="border border-slate-600 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Tag className="w-4 h-4 text-blue-400" />
                Serial Numbers
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-normal">
                  {serials.length} ชิ้น
                </span>
              </label>
              {/* quantity จะ sync อัตโนมัติตาม serial */}
            </div>

            {/* เพิ่ม serial */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSerial}
                onChange={e => setNewSerial(e.target.value)}
                onKeyDown={handleSerialKeyDown}
                placeholder="พิมพ์ serial แล้วกด Enter (หรือคั่นด้วย , หรือ space)"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={handleAddSerial}
                className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-sm transition-colors flex items-center gap-1">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* แสดง serial list */}
            {serials.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                {serials.map(s => (
                  <div key={s} className="flex items-center gap-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 group">
                    <span className="text-xs font-mono text-slate-300">{s}</span>
                    <button type="button" onClick={() => handleRemoveSerial(s)}
                      className="w-3.5 h-3.5 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {serials.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-2">ยังไม่มี serial — เพิ่มได้เลย</p>
            )}
          </div>

          {/* หมายเหตุ */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">หมายเหตุสินค้า</label>
            <textarea name="notes" rows={2} value={form.notes || ''} onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white resize-none"
              placeholder="รายละเอียดเพิ่มเติม..." />
          </div>

          {/* บันทึกการนับ */}
          <div className="border-t border-slate-700 pt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              บันทึกการนับสต๊อก
              <span className="text-slate-500 font-normal ml-1">(จะบันทึกในประวัติ)</span>
            </label>
            <input type="text" value={countNote} onChange={e => setCountNote(e.target.value)}
              placeholder="เช่น นับสต๊อกประจำเดือน, รับของใหม่..."
              className="w-full px-4 py-3 bg-slate-700/60 border border-blue-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl font-medium transition-all disabled:opacity-50">
              {loading
                ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5" />
                : <Save className="w-5 h-5" />}
              {isEdit ? 'บันทึกการนับ' : 'เพิ่มสินค้า'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
