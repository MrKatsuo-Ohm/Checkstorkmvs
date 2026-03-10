export function formatNumber(num) {
  return new Intl.NumberFormat('th-TH').format(num)
}

export function formatCurrency(num) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(num)
}

export function getStockStatus(item) {
  if (item.quantity === 0)
    return { text: 'หมด', className: 'bg-red-500/20 text-red-400', icon: 'AlertCircle' }
  if (item.quantity <= item.min_stock)
    return { text: 'ใกล้หมด', className: 'bg-amber-500/20 text-amber-400', icon: 'AlertTriangle' }
  return { text: 'พร้อมใช้', className: 'bg-emerald-500/20 text-emerald-400', icon: 'CheckCircle' }
}
