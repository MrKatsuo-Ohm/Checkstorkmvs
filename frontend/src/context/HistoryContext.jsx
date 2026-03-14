import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const HistoryContext = createContext(null)

export function HistoryProvider({ children }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  // โหลดประวัติจาก backend ตอนเริ่ม
  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : [])
      })
      .catch(err => console.error('Failed to load history:', err))
      .finally(() => setLoading(false))
  }, [])

  const addHistoryEntry = useCallback(async (entry) => {
    const newEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry
    }
    // อัปเดต UI ทันที (optimistic)
    setHistory(prev => [newEntry, ...prev])
    // บันทึกลง backend
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      })
    } catch (err) {
      console.error('Failed to save history:', err)
    }
  }, [])

  const clearHistory = useCallback(async () => {
    setHistory([])
    try {
      // ลบประวัติ + ปลดล็อคทุก subcategory ให้นับใหม่ได้
      await Promise.all([
        fetch('/api/history', { method: 'DELETE' }),
        fetch('/api/count-lock/all', { method: 'DELETE' }),
      ])
    } catch (err) {
      console.error('Failed to clear history:', err)
    }
  }, [])

  return (
    <HistoryContext.Provider value={{ history, loading, addHistoryEntry, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  )
}

export function useHistory() {
  const ctx = useContext(HistoryContext)
  if (!ctx) throw new Error('useHistory must be used inside HistoryProvider')
  return ctx
}
