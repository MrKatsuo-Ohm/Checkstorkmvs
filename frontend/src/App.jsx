import React, { useState, useEffect, useCallback } from 'react'
import { StockProvider, useStock } from './context/StockContext'
import { UserProvider, useUser } from './context/UserContext'
import { HistoryProvider } from './context/HistoryContext'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Toast from './components/Toast'
import StockModal from './components/StockModal'
import LoginScreen from './components/LoginScreen'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import AddForm from './pages/AddForm'
import LowStock from './pages/LowStock'
import Reports from './pages/Reports'
import StockHistory from './pages/StockHistory'
import StockCount from './pages/StockCount'
import CountSummary from './pages/CountSummary'

function AppContent() {
  const [view, setViewState] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [editingItem, setEditingItem] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { fetchItems, toast } = useStock()
  const { currentUser } = useUser()

  useEffect(() => {
    if (currentUser) fetchItems()
  }, [currentUser, fetchItems])

  // init history
  useEffect(() => {
    window.history.replaceState({ view: 'dashboard' }, '', '#dashboard')
  }, [])

  // navigate — push เฉพาะตอนเปลี่ยนหน้าระดับ App
  const setView = useCallback((newView) => {
    setViewState(newView)
    window.history.pushState({ view: newView }, '', `#${newView}`)
  }, [])

  // popstate — รับเฉพาะ event ที่ countStep ไม่มี (StockCount จัดการ countStep เอง)
  useEffect(() => {
    const onPop = (e) => {
      const s = e.state
      if (s?.countStep) return  // StockCount จัดการเอง
      const v = s?.view || window.location.hash.replace('#', '') || 'dashboard'
      setViewState(v)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const handleSearch = (val) => {
    setSearch(val)
    if (view !== 'inventory') setView('inventory')
  }

  const renderPage = () => {
    switch (view) {
      case 'dashboard': return <Dashboard onNavigate={setView} onFilterCategory={setFilterCategory} />
      case 'inventory': return <Inventory search={search} filterCategory={filterCategory} onEdit={setEditingItem} />
      case 'add': return <AddForm onSuccess={() => setView('inventory')} />
      case 'low-stock': return <LowStock onEdit={setEditingItem} />
      case 'count': return <StockCount />
      case 'count-summary': return <CountSummary />
      case 'history': return <StockHistory />
      case 'reports': return <Reports />
      default: return <Dashboard onNavigate={setView} onFilterCategory={setFilterCategory} />
    }
  }

  if (!currentUser) return <LoginScreen />

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      <Sidebar currentView={view} onNavigate={setView} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          search={search}
          onSearch={handleSearch}
          filterCategory={filterCategory}
          onFilter={setFilterCategory}
          onAdd={() => setEditingItem('new')}
          onMenuToggle={() => setMobileOpen(o => !o)}
        />
        <main className={`flex-1 p-4 md:p-6 ${
          view === 'count' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
        }`}>
          {renderPage()}
        </main>
      </div>
      {editingItem !== null && (
        <StockModal
          item={editingItem === 'new' ? null : editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

export default function App() {
  return (
    <UserProvider>
      <HistoryProvider>
        <StockProvider>
          <AppContent />
        </StockProvider>
      </HistoryProvider>
    </UserProvider>
  )
}
