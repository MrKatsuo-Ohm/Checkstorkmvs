import React from 'react'
import { LayoutDashboard, Package, PlusCircle, AlertTriangle, BarChart3, Boxes, Database, ClipboardList, LogOut, User, ScanLine, Laptop, Printer, PieChart } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { useUser } from '../context/UserContext'
import { useHistory } from '../context/HistoryContext'
import { formatNumber } from '../utils/helpers'

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'แดชบอร์ด' },
  { id: 'inventory', icon: Package, label: 'คลังสินค้า' },
  { id: 'add', icon: PlusCircle, label: 'เพิ่มสินค้า' },
  { id: 'count', icon: ScanLine, label: 'นับสต๊อก' },
  { id: 'count-summary', icon: PieChart, label: 'สรุปการนับ' },

  { id: 'history', icon: ClipboardList, label: 'ประวัติการนับ' },
  { id: 'reports', icon: BarChart3, label: 'รายงาน' }
]

export default function Sidebar({ currentView, onNavigate, mobileOpen, onMobileClose }) {
  const { items } = useStock()
  const { currentUser, logout } = useUser()
  const { history } = useHistory()

  const lowCount = items.filter(i => i.quantity <= i.min_stock).length
  const todayCount = history.filter(h => {
    const today = new Date().toDateString()
    return new Date(h.timestamp).toDateString() === today
  }).length

  const handleNav = (id) => {
    onNavigate(id)
    if (onMobileClose) onMobileClose()
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={onMobileClose} />
      )}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-800 border-r border-slate-700 flex flex-col
        transition-transform duration-300
        lg:static lg:translate-x-0 lg:z-auto
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Boxes className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">IT Stock Manager</h1>
            <p className="text-xs text-slate-400">IT Stock Management</p>
          </div>
        </div>
      </div>

      {/* Current user card */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2 bg-slate-700/50 rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 leading-none mb-0.5">ผู้นับสต๊อก</p>
            <p className="text-sm font-semibold text-white truncate">{currentUser?.name}</p>
          </div>
          <button
            onClick={logout}
            title="ออกจากระบบ"
            className="p-1.5 hover:bg-slate-600 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(({ id, icon: Icon, label }) => (
            <li key={id}>
              <button
                onClick={() => handleNav(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  currentView === id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{label}</span>

                {id === 'history' && todayCount > 0 && (
                  <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {todayCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">สรุปสต๊อก</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{formatNumber(items.length)}</div>
          <div className="text-xs text-slate-400">รายการทั้งหมด</div>
          <div className="mt-2 pt-2 border-t border-slate-600">
            <div className="text-xs text-slate-400">นับวันนี้</div>
            <div className="text-lg font-bold text-cyan-400">{todayCount} ครั้ง</div>
          </div>
        </div>
      </div>
      </aside>
    </>
  )
}