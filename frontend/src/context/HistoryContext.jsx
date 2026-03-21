import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const HistoryContext = createContext(null)

// retry fetch สูงสุด 3 ครั้ง
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, 500 * (i + 1))) // backoff 500ms, 1000ms, 1500ms
    }
  }
}

export function HistoryProvider({ children }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load history:', err))
      .finally(() => setLoading(false))
  }, [])

  const addHistoryEntry = useCallback(async (entry) => {
    const newEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry
    }
    // optimistic update — แสดงทันที
    setHistory(prev => [newEntry, ...prev])

    // บันทึกลง backend พร้อม retry
    try {
      await fetchWithRetry('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      })
    } catch (err) {
      console.error('Failed to save history after retries:', err)
      // rollback ถ้า save ไม่สำเร็จหลัง retry หมด
      setHistory(prev => prev.filter(h => h.id !== newEntry.id))
    }
  }, [])

  const clearHistory = useCallback(async () => {
    setHistory([])
    try {
      await Promise.all([
        fetch('/api/history', { method: 'DELETE' }),
        fetch('/api/count-lock/all', { method: 'DELETE' }),
      ])
      // แจ้ง StockCount ให้ reset lockedSubs
      window.dispatchEvent(new CustomEvent('count-locks-cleared'))
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
