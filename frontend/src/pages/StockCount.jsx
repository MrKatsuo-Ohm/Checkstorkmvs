import React, { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  RotateCcw,
  Send,
  Plus,
  Minus,
  Package,
  ClipboardCheck,
  X,
  Search,
  AlertCircle,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useStock } from "../context/StockContext";
import { useUser } from "../context/UserContext";
import { useHistory } from "../context/HistoryContext";
import { categories } from "../utils/constants";

export default function StockCount() {
  const { items, updateItem } = useStock();
  const { currentUser } = useUser();
  const { addHistoryEntry } = useHistory();

  const [step, setStep] = useState("category");
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [counts, setCounts] = useState({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [searchQ, setSearchQ] = useState("");

  const listItems = items.filter(
    (i) => i.category === selectedCat && i.subcategory === selectedSub, // ✅ กลับมาเหมือนเดิม
  );

  const filtered = searchQ.trim()
    ? listItems.filter(
        (i) =>
          i.name.toLowerCase().includes(searchQ.toLowerCase()) ||
          (i.product_code || "").toLowerCase().includes(searchQ.toLowerCase()),
      )
    : listItems;

  const subCatsWithItems = selectedCat
    ? categories[selectedCat].subcategories.filter((sub) =>
        items.some((i) => i.category === selectedCat && i.subcategory === sub),
      )
    : [];

  const setCount = (id, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setCounts((prev) => ({ ...prev, [id]: num }));
  };

  const adjust = (id, delta) => {
    setCounts((prev) => ({
      ...prev,
      [id]: Math.max(
        0,
        (prev[id] ?? items.find((i) => i.id === id)?.quantity ?? 0) + delta,
      ),
    }));
  };

  const handleSelectCat = (catKey) => {
    setSelectedCat(catKey);
    setSelectedSub(null);
    setSavedCount(0);
    // ✅ init counts ทุก item ในหมวดนั้นเลย
    const catItems = items.filter((i) => i.category === catKey);
    const init = {};
    catItems.forEach((i) => {
      init[i.id] = i.quantity;
    });
    setCounts(init);
    setStep("subcategory");
  };

  const handleSelectSub = (sub) => {
    setSelectedSub(sub);
    setSearchQ("");
    const subItems = items.filter(
      (i) => i.category === selectedCat && i.subcategory === sub,
    );
    const init = {};
    subItems.forEach((i) => {
      init[i.id] = i.quantity;
    }); // ✅ init ทุก item
    setCounts(init); // ✅ replace ไม่ใช่ merge
    setStep("count");
  };

  const handleBack = () => {
    if (step === "count") {
      setStep("subcategory");
      setSelectedSub(null);
    } else if (step === "subcategory") {
      setStep("category");
      setSelectedCat(null);
    }
  };

  const changedItems = listItems.filter(
    (i) => counts[i.id] !== undefined && counts[i.id] !== i.quantity,
  );

  const handleSave = async () => {
    setSaving(true);
    let saved = 0;
    for (const item of listItems) {
      if (counts[item.id] === undefined) continue;
      const newQty = counts[item.id];
      const ok = await updateItem(item.id, { ...item, quantity: newQty });
      if (ok) {
        addHistoryEntry({
          type: "update",
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          subcategory: item.subcategory,
          quantityBefore: item.quantity,
          quantityAfter: newQty,
          priceBefore: item.price,
          priceAfter: item.price,
          counter: currentUser?.name || "ไม่ระบุ",
          note: note || `นับสต๊อก ${categories[selectedCat]?.name}`,
        });
        saved++;
      }
    }
    setSavedCount(saved);
    setSaving(false);
    setNote("");
  };

  const cat = selectedCat ? categories[selectedCat] : null;
  const CatIcon = cat ? LucideIcons[cat.icon] || Package : Package;

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm flex-wrap">
        <ClipboardCheck className="w-5 h-5 text-blue-400 shrink-0" />
        <button
          onClick={() => setStep("category")}
          className={`font-semibold ${step === "category" ? "text-white" : "text-slate-400 hover:text-white"}`}
        >
          นับสต๊อก
        </button>
        {selectedCat && (
          <>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <button
              onClick={() => step === "count" && setStep("subcategory")}
              className={`font-semibold ${step === "subcategory" ? "text-white" : "text-slate-400 hover:text-white"}`}
            >
              {cat?.name}
            </button>
          </>
        )}
        {selectedSub && (
          <>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className="text-white font-semibold">{selectedSub}</span>
          </>
        )}
        <div className="ml-auto text-slate-500 text-xs">
          ผู้นับ:{" "}
          <span className="text-blue-300 font-medium">{currentUser?.name}</span>
        </div>
      </div>

      {/* Step 1: เลือกหมวดหลัก */}
      {step === "category" && (
        <div className="flex-1 overflow-y-auto">
          <p className="text-slate-400 text-sm mb-4">
            เลือกหมวดสินค้าที่จะนับสต๊อก
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(categories).map(([key, cat]) => {
              const Icon = LucideIcons[cat.icon] || Package;
              const catItems = items.filter((i) => i.category === key);
              if (catItems.length === 0) return null;
              const totalQty = catItems.reduce((s, i) => s + i.quantity, 0);
              return (
                <button
                  key={key}
                  onClick={() => handleSelectCat(key)}
                  className="flex flex-col items-start gap-2 p-4 bg-slate-800 border border-slate-700 hover:border-blue-500 hover:bg-slate-700/80 rounded-2xl transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-xl flex items-center justify-center transition-colors">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">
                      {cat.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {catItems.length} รายการ · {totalQty} ชิ้น
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 self-end transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: เลือกหมวดย่อย */}
      {step === "subcategory" && (
        <div className="flex-1 overflow-y-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> กลับ
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subCatsWithItems.map((sub) => {
              const subItems = items.filter(
                (i) => i.category === selectedCat && i.subcategory === sub,
              );
              const totalQty = subItems.reduce((s, i) => s + i.quantity, 0);
              return (
                <button
                  key={sub}
                  onClick={() => handleSelectSub(sub)}
                  className="flex items-center gap-4 p-4 bg-slate-800 border border-slate-700 hover:border-blue-500 hover:bg-slate-700/80 rounded-2xl transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-slate-700 group-hover:bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                    <CatIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{sub}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {subItems.length} รายการ · รวม {totalQty} ชิ้น
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: นับรายการ - ✅ flex-col on mobile, flex-row on desktop */}
      {step === "count" && (
        <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden min-h-0">
          {/* รายการ */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors shrink-0"
              >
                <ChevronLeft className="w-4 h-4" /> กลับ
              </button>
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="ค้นหาในหมวดนี้..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQ && (
                  <button
                    onClick={() => setSearchQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                )}
              </div>
              <span className="text-slate-500 text-sm shrink-0">
                {filtered.length} รายการ
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filtered.length === 0 && (
                <div className="flex items-center justify-center h-40 text-slate-500">
                  ไม่พบรายการ
                </div>
              )}
              {filtered.map((item, idx) => {
                const cur = counts[item.id] ?? item.quantity;
                const isChanged = cur !== item.quantity;
                const diff = cur - item.quantity;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-3 rounded-xl border transition-colors ${
                      isChanged
                        ? "bg-amber-500/5 border-amber-500/30"
                        : "bg-slate-800/60 border-slate-700/60"
                    }`}
                  >
                    {/* แถวบน: เลขลำดับ + ชื่อ */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-slate-600 text-xs w-5 shrink-0 text-right">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {item.name}
                        </p>
                        {item.product_code && (
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            #{item.product_code}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* แถวล่าง (mobile) / ขวา (desktop): จำนวนระบบ + ปุ่ม + diff */}
                    <div className="flex items-center gap-2 justify-between sm:justify-end">
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-xs text-slate-500">ระบบ</p>
                        <p className="text-sm font-semibold text-slate-300">
                          {item.quantity}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 sm:hidden">
                        ระบบ: {item.quantity}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => adjust(item.id, -1)}
                          className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-red-500/30 hover:text-red-400 rounded-lg transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={cur}
                          onChange={(e) => setCount(item.id, e.target.value)}
                          className={`w-14 text-center py-1.5 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 border transition-colors ${
                            isChanged
                              ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                              : "bg-slate-700 border-slate-600 text-white"
                          }`}
                        />
                        <button
                          onClick={() => adjust(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-emerald-500/30 hover:text-emerald-400 rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="w-8 text-right shrink-0">
                        {isChanged ? (
                          <span
                            className={`text-xs font-bold ${diff > 0 ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-slate-700 ml-auto" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel สรุป - ✅ full width on mobile, fixed width on desktop */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                <span className="text-slate-400">
                  หมวด:{" "}
                  <span className="text-blue-300 font-medium">
                    {selectedSub}
                  </span>
                </span>
                <div className="flex gap-3">
                  <span className="text-slate-400">
                    ทั้งหมด:{" "}
                    <span className="font-bold text-white">
                      {listItems.reduce(
                        (s, i) => s + (counts[i.id] ?? i.quantity),
                        0,
                      )}{" "}
                      ชิ้น
                    </span>
                  </span>
                  <span className="text-slate-400">
                    เปลี่ยน:{" "}
                    <span
                      className={`font-bold ${changedItems.length > 0 ? "text-amber-400" : "text-slate-400"}`}
                    >
                      {changedItems.length}
                    </span>
                  </span>
                  <span className="text-slate-400">
                    ตรงกัน:{" "}
                    <span className="font-bold text-emerald-400">
                      {listItems.length - changedItems.length}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="บันทึก..."
                  className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 rounded-lg font-semibold text-xs transition-all whitespace-nowrap"
                >
                  {saving ? (
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-3 h-3" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  บันทึก{" "}
                  {listItems.reduce(
                    (s, i) => s + (counts[i.id] ?? i.quantity),
                    0,
                  )}{" "}
                  ชิ้น
                </button>
              </div>

              <button
                onClick={() => {
                  const reset = {};
                  listItems.forEach((i) => {
                    reset[i.id] = i.quantity;
                  });
                  setCounts((prev) => ({ ...prev, ...reset }));
                }}
                className="flex items-center justify-center gap-1 text-slate-500 hover:text-white text-xs transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> รีเซ็ตเป็นค่าเดิม
              </button>
            </div>

            {savedCount > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">
                <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  บันทึกแล้ว {savedCount} รายการ
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
