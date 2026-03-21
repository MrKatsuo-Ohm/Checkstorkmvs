import React, { useMemo } from 'react'
import { Package, Banknote, PackageX, Grid3x3, Clock, Inbox, ClipboardCheck } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useStock } from '../context/StockContext'
import { useHistory } from '../context/HistoryContext'
import { categories } from '../utils/constants'
import { formatNumber, formatCurrency, getStockStatus } from '../utils/helpers'

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ data, total }) {
  const size = 160
  const cx = size / 2
  const cy = size / 2
  const r = 58
  const stroke = 22

  const COLORS = [
    '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899',
    '#f59e0b', '#10b981', '#ef4444', '#f97316',
    '#6366f1', '#84cc16'
  ]

  let cumAngle = -90
  const slices = data
    .filter(d => d.count > 0)
    .map((d, i) => {
      const pct = d.count / total
      const angle = pct * 360
      const start = cumAngle
      cumAngle += angle
      return { ...d, pct, startAngle: start, endAngle: cumAngle, color: COLORS[i % COLORS.length] }
    })

  const polarToCart = (angle, radius) => {
    const rad = (angle * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad)
    }
  }

  const describeArc = (startAngle, endAngle, radius) => {
    const start = polarToCart(startAngle, radius)
    const end = polarToCart(endAngle - 0.01, radius)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative shrink-0">
        <svg width={size} height={size}>
          {/* Background circle */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
          {slices.map((s, i) => (
            <path
              key={i}
              d={describeArc(s.startAngle, s.endAngle, r)}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold text-white leading-none">{formatNumber(total)}</p>
          <p className="text-xs text-slate-400 mt-0.5">ชิ้น</p>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 flex-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-slate-400 truncate">{s.name}</span>
            <span className="text-xs font-medium text-white ml-auto shrink-0">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Count Progress ────────────────────────────────────────────────────────────
function CountProgress({ items, history, lockedSubs }) {
  const totalSubs = useMemo(() => {
    const subs = new Set()
    items.forEach(i => subs.add(`${i.category}|${i.subcategory}`))
    return subs.size
  }, [items])

  // นับจาก count-lock ที่มีอยู่
  const countedSubs = lockedSubs?.size || 0
  const pct = totalSubs > 0 ? Math.round((countedSubs / totalSubs) * 100) : 0

  // นับวันนี้
  const todayCount = history.filter(h => {
    const today = new Date().toDateString()
    return new Date(h.timestamp).toDateString() === today
  }).length

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-blue-400" />
          ความคืบหน้าการนับสต็อก
        </h3>
        <span className="text-2xl font-bold text-blue-400">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-700 rounded-full h-3 mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : 'linear-gradient(90deg, #3b82f6, #06b6d4)'
          }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          นับแล้ว <span className="text-white font-medium">{countedSubs}</span> / {totalSubs} หมวดย่อย
        </span>
        <span className="text-slate-400">
          วันนี้นับ <span className="text-cyan-400 font-medium">{todayCount}</span> ครั้ง
        </span>
      </div>

      {pct === 100 && (
        <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm font-medium">
          <span>🎉</span> นับสต็อกครบทุกหมวดหมู่แล้ว!
        </div>
      )}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, Icon }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">{value}</p>
          <p className="text-sm mt-1 opacity-80">{sub}</p>
        </div>
        <div className="w-12 h-12 md:w-14 md:h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 md:w-7 md:h-7" />
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate, onFilterCategory, lockedSubs }) {
  const { items } = useStock()
  const { history } = useHistory()

  const totalValue   = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const outOfStock   = items.filter(i => i.quantity === 0).length
  const totalSerials = items.reduce((s, i) => s + (i.serials?.length || i.quantity), 0)

  const categoryStats = Object.entries(categories).map(([key, cat]) => {
    const filtered = items.filter(i => i.category === key)
    return {
      key, ...cat,
      count: filtered.reduce((s, i) => s + (i.serials?.length || i.quantity), 0),
      value: filtered.reduce((s, i) => s + i.price * i.quantity, 0)
    }
  })

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <StatCard
          label="สินค้าทั้งหมด" value={formatNumber(totalSerials)} sub="ชิ้น (serial)"
          color="from-blue-500/20 to-blue-600/10 border border-blue-500/30" Icon={Package}
        />
        <StatCard
          label="มูลค่ารวม" value={formatCurrency(totalValue)} sub="บาท"
          color="from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30" Icon={Banknote}
        />
        <StatCard
          label="สินค้าหมด" value={formatNumber(outOfStock)} sub="รายการ"
          color="from-red-500/20 to-red-600/10 border border-red-500/30" Icon={PackageX}
        />
      </div>

      {/* Count Progress */}
      <CountProgress items={items} history={history} lockedSubs={lockedSubs} />

      {/* Donut chart + category summary */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-5 flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-blue-400" />สรุปตามหมวดหมู่
        </h2>

        {totalSerials > 0 ? (
          <DonutChart
            data={categoryStats}
            total={totalSerials}
          />
        ) : (
          <p className="text-slate-400 text-center py-8">ยังไม่มีข้อมูล</p>
        )}

        {/* Category grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4 mt-6 pt-5 border-t border-slate-700">
          {categoryStats.map(cat => {
            const Icon = LucideIcons[cat.icon] || Package
            if (cat.count === 0) return null
            return (
              <button
                key={cat.key}
                onClick={() => { onFilterCategory(cat.key); onNavigate('inventory') }}
                className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl p-3 md:p-4 text-center transition-all"
              >
                <div className="w-9 h-9 md:w-12 md:h-12 mx-auto mb-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                </div>
                <p className="font-medium text-xs md:text-sm leading-tight">{cat.name}</p>
                <p className="text-xl md:text-2xl font-bold text-blue-400 mt-1">{cat.count}</p>
                <p className="text-xs text-slate-400 hidden md:block">{formatCurrency(cat.value)}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recent items */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />รายการล่าสุด
        </h2>
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
              <Inbox className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-400">ยังไม่มีสินค้าในระบบ</p>
            <button onClick={() => onNavigate('add')}
              className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium transition-colors">
              เพิ่มสินค้าแรก
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">สินค้า</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium hidden md:table-cell">หมวดหมู่</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">จำนวน</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium hidden sm:table-cell">ราคา</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 5).map(item => {
                  const status = getStockStatus(item)
                  const cat = categories[item.category]
                  const CatIcon = LucideIcons[cat?.icon] || Package
                  const StatusIcon = LucideIcons[status.icon] || Package
                  return (
                    <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                            <CatIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[140px] md:max-w-none">{item.name}</p>
                            <p className="text-xs text-slate-400">{item.subcategory}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 hidden md:table-cell">{cat?.name || item.category}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatNumber(item.quantity)}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 hidden sm:table-cell">{formatCurrency(item.price)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                            <StatusIcon className="w-3 h-3" />
                            <span className="hidden sm:inline">{status.text}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
