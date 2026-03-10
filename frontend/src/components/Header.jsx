import React from 'react'
import { Search, Plus, SlidersHorizontal } from 'lucide-react'
import { categories } from '../utils/constants'

export default function Header({ search, onSearch, filterCategory, onFilter, onAdd, onMenuToggle }) {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 shrink-0">
      <div className="flex items-center gap-2">

        {/* Hamburger — mobile only */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-slate-700 rounded-xl transition-colors shrink-0"
          >
            <SlidersHorizontal className="w-5 h-5 text-slate-400" />
          </button>
        )}

        {/* Search — flex-1 so it fills available space */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 text-sm"
          />
        </div>

        {/* Category filter — hidden on xs, visible from sm */}
        <select
          value={filterCategory}
          onChange={e => onFilter(e.target.value)}
          className="hidden sm:block px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm shrink-0 max-w-[160px]"
        >
          <option value="all">ทุกหมวดหมู่</option>
          {Object.entries(categories).map(([key, cat]) => (
            <option key={key} value={key}>{cat.name}</option>
          ))}
        </select>

        {/* Add button — icon only on mobile, full label on md+ */}
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl font-medium transition-all shrink-0 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">เพิ่มสินค้าใหม่</span>
        </button>
      </div>

      {/* Category filter row — xs only (below search bar) */}
      <div className="sm:hidden mt-2">
        <select
          value={filterCategory}
          onChange={e => onFilter(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
        >
          <option value="all">ทุกหมวดหมู่</option>
          {Object.entries(categories).map(([key, cat]) => (
            <option key={key} value={key}>{cat.name}</option>
          ))}
        </select>
      </div>
    </header>
  )
}
