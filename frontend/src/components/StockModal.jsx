import React, { useState, useEffect } from 'react'
import { X, Save, User } from 'lucide-react'
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
    product_code: '', quantity: '', min_stock: 5, price: '', location: '', notes: ''
  })
  const [countNote, setCountNote] = useState('')

  useEffect(() => {
    if (item) {
      setForm({ ...item })
    } else {
      const firstCat = 'hardware'
      setForm(f => ({ ...f, category: firstCat, subcategory: categories[firstCat].subcategories[0] }))
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      quantity: parseInt(form.quantity) || 0,
      min_stock: parseInt(form.min_stock) || 5,
      price: parseFloat(form.price) || 0
    }

    let ok
    if (isEdit) {
      ok = await updateItem(item.id, payload)
      if (ok) {
        addHistoryEntry({
          type: 'update',
          itemId: item.id,
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
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                จำนวน * {isEdit && <span className="text-slate-400 font-normal">(เดิม: {item.quantity})</span>}
              </label>
              <input name="quantity" type="number" min="0" required value={form.quantity} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="0" />
            </div>

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">ราคา (บาท) *</label>
              <input name="price" type="number" min="0" step="0.01" required value={form.price} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">ตำแหน่ง</label>
              <input name="location" value={form.location} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="เช่น ชั้น A-01" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">หมายเหตุสินค้า</label>
            <textarea name="notes" rows={2} value={form.notes} onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white resize-none"
              placeholder="รายละเอียดเพิ่มเติม..." />
          </div>

          <div className="border-t border-slate-700 pt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              บันทึกการนับสต๊อก
              <span className="text-slate-500 font-normal ml-1">(จะบันทึกในประวัติ)</span>
            </label>
            <input type="text" value={countNote} onChange={e => setCountNote(e.target.value)}
              placeholder="เช่น นับสต๊อกประจำเดือน, รับของใหม่, ตรวจสอบพิเศษ..."
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
