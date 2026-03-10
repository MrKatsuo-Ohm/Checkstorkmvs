import React from 'react'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'

const config = {
  success: { bg: 'bg-emerald-500', Icon: CheckCircle },
  error: { bg: 'bg-red-500', Icon: AlertCircle },
  info: { bg: 'bg-blue-500', Icon: Info }
}

export default function Toast({ message, type = 'info' }) {
  const { bg, Icon } = config[type] || config.info
  return (
    <div className={`fixed bottom-6 right-6 ${bg} text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-pulse`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
