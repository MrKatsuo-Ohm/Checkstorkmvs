import React, { useState } from 'react'
import { Boxes, UserCheck, ChevronRight } from 'lucide-react'
import { useUser } from '../context/UserContext'

export default function LoginScreen() {
  const { login } = useUser()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('กรุณากรอกชื่อก่อนเข้าใช้งาน')
      return
    }
    if (trimmed.length < 2) {
      setError('ชื่อต้องมีอย่างน้อย 2 ตัวอักษร')
      return
    }
    login(trimmed)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Boxes className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">IT Stock Manager</h1>
          <p className="text-slate-400 mt-2">ระบบจัดการสต๊อกอุปกรณ์คอมพิวเตอร์</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <UserCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">ลงชื่อเข้าใช้งาน</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                ชื่อ-นามสกุล ผู้นับสต๊อก
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                placeholder="กรอกชื่อของคุณ..."
                autoFocus
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
              />
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl font-semibold transition-all mt-2"
            >
              เข้าใช้งาน
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-4">
          ชื่อของคุณจะถูกบันทึกทุกครั้งที่มีการปรับสต๊อก
        </p>
      </div>
    </div>
  )
}
