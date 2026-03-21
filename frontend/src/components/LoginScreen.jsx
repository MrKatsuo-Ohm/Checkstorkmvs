import React, { useState } from 'react'
import { Boxes, ChevronRight, Monitor, HardDrive, Wifi, Printer } from 'lucide-react'
import { useUser } from '../context/UserContext'

export default function LoginScreen() {
  const { login } = useUser()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('กรุณากรอกชื่อก่อนเข้าใช้งาน'); return }
    if (trimmed.length < 2) { setError('ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'); return }
    login(trimmed)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{animationDelay:'1.5s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      {/* Floating icons */}
      {[
        { Icon: Monitor,   cls: 'top-16 left-16',    delay: '0s'   },
        { Icon: HardDrive, cls: 'top-24 right-24',   delay: '0.8s' },
        { Icon: Wifi,      cls: 'bottom-20 left-20', delay: '1.6s' },
        { Icon: Printer,   cls: 'bottom-16 right-16',delay: '2.4s' },
      ].map(({ Icon, cls, delay }, i) => (
        <div key={i} className={`absolute ${cls} opacity-[0.07] animate-bounce`}
          style={{ animationDelay: delay, animationDuration: '3s' }}>
          <Icon className="w-12 h-12 text-blue-300" />
        </div>
      ))}

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex mb-5">
            <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/40">
              <Boxes className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">IT Stock</h1>
          <p className="text-blue-400 font-semibold text-xs tracking-[0.3em] uppercase mt-1">Manager</p>
          <p className="text-slate-500 text-sm mt-2">ระบบจัดการสต๊อกอุปกรณ์คอมพิวเตอร์</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl shadow-black/50">
          <p className="text-slate-400 text-sm mb-5 text-center">ลงชื่อเพื่อเริ่มนับสต๊อก</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="ชื่อ-นามสกุล ผู้นับสต๊อก"
                autoFocus
                className={`w-full px-5 py-4 bg-slate-800/60 border rounded-2xl text-white placeholder-slate-500 text-sm transition-all outline-none ${
                  focused ? 'border-blue-500 ring-4 ring-blue-500/10'
                  : error  ? 'border-red-500/50'
                  : 'border-slate-700'
                }`}
              />
              {error && <p className="mt-2 text-xs text-red-400 pl-1">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all group"
            >
              เข้าใช้งาน
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-5">
          ชื่อของคุณจะถูกบันทึกทุกครั้งที่มีการปรับสต๊อก
        </p>
      </div>
    </div>
  )
}
