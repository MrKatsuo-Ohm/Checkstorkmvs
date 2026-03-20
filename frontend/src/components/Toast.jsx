import React, { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'

const config = {
  success: { bg: 'bg-emerald-500', Icon: CheckCircle },
  error:   { bg: 'bg-red-500',     Icon: AlertCircle },
  info:    { bg: 'bg-blue-500',    Icon: Info }
}

export default function Toast({ message, type = 'info' }) {
  const { bg, Icon } = config[type] || config.info
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // trigger slide-in
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        ${bg} text-white px-5 py-3.5 rounded-xl shadow-lg
        flex items-center gap-3
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}
