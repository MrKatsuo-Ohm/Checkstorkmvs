import React, { useState, useEffect } from 'react'
import { PlusCircle, Save } from 'lucide-react'
import { categories } from '../utils/constants'
import { useStock } from '../context/StockContext'

const emptyForm = {
  name: '', category: 'hardware', subcategory: 'CPU',
  quantity: '', min_stock: 5, price: '', location: '', notes: ''
}

export default function AddForm({ onSuccess }) {
  const { createItem, loading } = useStock()
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    setForm(f => ({ ...f, subcategory: categories[f.category]?.subcategories[0] || '' }))
  }, [form.category])

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const ok = await createItem({
      ...form,
      quantity: parseInt(form.quantity) || 0,
      min_stock: parseInt(form.min_stock) || 5,
      price: parseFloat(form.price) || 0
    })
    if (ok) {
      setForm(emptyForm)
      onSuccess()
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-blue-400" />เพิ่มสินค้าใหม่
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">ชื่อสินค้า *</label>
              <input name="name" required value={form.name} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="เช่น AMD Ryzen 5 5600X" />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">จำนวน *</label>
              <input name="quantity" type="number" min="0" required value={form.quantity} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="0" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">จำนวนขั้นต่ำ</label>
              <input name="min_stock" type="number" min="0" value={form.min_stock} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">ราคาต่อหน่วย (บาท) *</label>
              <input name="price" type="number" min="0" step="0.01" required value={form.price} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="0.00" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">ตำแหน่งจัดเก็บ</label>
              <input name="location" value={form.location} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="เช่น ชั้น A-01" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">หมายเหตุ</label>
            <textarea name="notes" rows={3} value={form.notes} onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white resize-none"
              placeholder="รายละเอียดเพิ่มเติม..." />
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl font-medium transition-all disabled:opacity-50">
            {loading
              ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5" />
              : <Save className="w-5 h-5" />}
            บันทึกสินค้า
          </button>
        </form>
      </div>
    </div>
  )
}
