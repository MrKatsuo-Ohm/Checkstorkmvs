import React, { createContext, useContext, useState, useCallback } from 'react'

const HistoryContext = createContext(null)

export function HistoryProvider({ children }) {
  const [history, setHistory] = useState([])

  // Record a stock count/update event
  const addHistoryEntry = useCallback((entry) => {
    setHistory(prev => [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...entry
      },
      ...prev
    ])
  }, [])

  const clearHistory = useCallback(() => setHistory([]), [])

  return (
    <HistoryContext.Provider value={{ history, addHistoryEntry, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  )
}

export function useHistory() {
  const ctx = useContext(HistoryContext)
  if (!ctx) throw new Error('useHistory must be used inside HistoryProvider')
  return ctx
}
