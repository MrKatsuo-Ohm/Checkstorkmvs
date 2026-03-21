import React, { useState, useEffect, useCallback } from "react";
import { StockProvider, useStock } from "./context/StockContext";
import { UserProvider, useUser } from "./context/UserContext";
import { HistoryProvider } from "./context/HistoryContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Toast from "./components/Toast";
import StockModal from "./components/StockModal";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import AddForm from "./pages/AddForm";
import Reports from "./pages/Reports";
import StockHistory from "./pages/StockHistory";
import StockCount from "./pages/StockCount";
import CountSummary from "./pages/CountSummary";

// หน้าทั้งหมดเรียงตาม navigation hierarchy
const VIEW_STACK = [
  "dashboard",
  "inventory", "add", "low-stock",
  "count", "count-summary",
  "history", "reports"
];

function AppContent() {
  const [view, setViewState] = useState("dashboard");
  const [lockedSubs, setLockedSubs] = useState(new Set());

  // โหลด lock ทั้งหมดจาก backend ตอน mount
  useEffect(() => {
    fetch('/api/count-lock')
      .then(r => r.json())
      .then(({ keys }) => {
        if (Array.isArray(keys)) setLockedSubs(new Set(keys));
      })
      .catch(() => {});
  }, []);

  // ฟัง event ล้างประวัติ → reset lockedSubs
  useEffect(() => {
    const onClear = () => setLockedSubs(new Set());
    window.addEventListener('count-locks-cleared', onClear);
    return () => window.removeEventListener('count-locks-cleared', onClear);
  }, []);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingItem, setEditingItem] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { fetchItems, toast } = useStock();
  const { currentUser } = useUser();

  useEffect(() => {
    if (currentUser) fetchItems();
  }, [currentUser, fetchItems]);

  // init — ตั้งต้นที่ dashboard และ push sentinel entry ไว้
  // sentinel ทำให้เมื่อกด back ครั้งแรกจะ popstate แทนที่จะออกจากแอป
  useEffect(() => {
    // entry 0: sentinel (ป้องกันออกจากแอป)
    window.history.replaceState({ view: "dashboard", sentinel: true }, "", "#dashboard");
    // entry 1: dashboard จริง
    window.history.pushState({ view: "dashboard" }, "", "#dashboard");
  }, []);

  // navigate — push history entry ทุกครั้งที่เปลี่ยนหน้า
  const setView = useCallback((newView) => {
    setViewState(newView);
    window.history.pushState({ view: newView }, "", `#${newView}`);
  }, []);

  // popstate — จัดการ back button ทีละหน้า
  useEffect(() => {
    const onPop = (e) => {
      const s = e.state;
      // StockCount จัดการ countStep เอง
      if (s?.countStep) return;

      if (s?.sentinel) {
        // กด back ถึง sentinel = กำลังจะออกจากแอป → push dashboard กลับไป
        window.history.pushState({ view: "dashboard" }, "", "#dashboard");
        setViewState("dashboard");
        return;
      }

      const v = s?.view || window.location.hash.replace("#", "") || "dashboard";
      setViewState(v);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const handleSearch = (val) => {
    setSearch(val);
    if (view !== "inventory") setView("inventory");
  };

  const renderPage = () => {
    switch (view) {
      case "dashboard":
        return <Dashboard onNavigate={setView} onFilterCategory={setFilterCategory} lockedSubs={lockedSubs} />;
      case "inventory":
        return <Inventory search={search} filterCategory={filterCategory} onEdit={setEditingItem} />;
      case "add":
        return <AddForm onSuccess={() => setView("inventory")} />;
      case "count":
        return <StockCount onLockChange={setLockedSubs} />;
      case "count-summary":
        return <CountSummary />;
      case "history":
        return <StockHistory />;
      case "reports":
        return <Reports />;
      default:
        return <Dashboard onNavigate={setView} onFilterCategory={setFilterCategory} />;
    }
  };

  if (!currentUser) return <LoginScreen />;

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      <Sidebar
        currentView={view}
        onNavigate={setView}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          search={search}
          onSearch={handleSearch}
          filterCategory={filterCategory}
          onFilter={setFilterCategory}
          onAdd={() => setEditingItem("new")}
          onMenuToggle={() => setMobileOpen((o) => !o)}
        />
        <main
          className={`flex-1 ${
            view === "count"
              ? "overflow-y-auto lg:relative lg:overflow-hidden"
              : "overflow-y-auto p-4 md:p-6"
          }`}
        >
          <div key={view} className="animate-fadeIn h-full">
            {renderPage()}
          </div>
        </main>
      </div>
      {editingItem !== null && (
        <StockModal
          item={editingItem === "new" ? null : editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
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
  );
}
