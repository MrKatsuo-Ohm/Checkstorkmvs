import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ChevronRight, ChevronLeft, CheckCircle2, RotateCcw, Send,
  Package, ClipboardCheck, X, Search, Scan, Camera, CameraOff, Zap,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useStock } from "../context/StockContext";
import { useUser } from "../context/UserContext";
import { useHistory } from "../context/HistoryContext";
import { categories } from "../utils/constants";

const getCatLabel = (key) => categories[key]?.name || key;

// normalize lock key — ใช้เหมือนกันทุกที่เพื่อกัน mismatch
const makeLockKey = (cat, sub) => `${cat}|${sub}`;

export default function StockCount({ onLockChange } = {}) {
  const { items } = useStock();
  const { currentUser } = useUser();
  const { addHistoryEntry } = useHistory();

  const [step, setStep]               = useState("category");
  const [lockedSubs, setLockedSubs]   = useState(new Set()); // subcategory ที่นับแล้วทุกเครื่อง
  const [unlockTarget, setUnlockTarget] = useState(null); // { key, name } สำหรับ confirm modal

  // โหลด lock ทั้งหมดจาก backend ตอน mount (รองรับ refresh)
  useEffect(() => {
    fetch('/api/count-lock')
      .then(r => r.json())
      .then(({ keys }) => {
        if (Array.isArray(keys)) setLockedSubs(new Set(keys));
      })
      .catch(() => {});
  }, []);

  // ฟัง event จาก HistoryContext ตอนล้างประวัติ → reset lock ทันที
  useEffect(() => {
    const onClear = () => setLockedSubs(new Set());
    window.addEventListener('count-locks-cleared', onClear);
    return () => window.removeEventListener('count-locks-cleared', onClear);
  }, []);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [scannedSerials, setScannedSerials] = useState(new Set());
  const [isLocked, setIsLocked]       = useState(false);
  const [note, setNote]               = useState("");
  const [saving, setSaving]           = useState(false);
  const [savedCount, setSavedCount]   = useState(0);
  const [searchQ, setSearchQ]         = useState("");
  const [manualInput, setManualInput] = useState("");
  const [scanMode, setScanMode]       = useState(false);
  const [gunMode, setGunMode]         = useState(false);
  const [scanResult, setScanResult]   = useState(null);

  const videoRef            = useRef(null);
  const codeReaderRef       = useRef(null);
  const streamRef           = useRef(null);
  const rafIdRef            = useRef(null);
  const scanCooldownRef     = useRef(false);
  const gunBufferRef        = useRef('');
  const gunTimerRef         = useRef(null);
  const scannedSerialsRef   = useRef(new Set());
  const sessionKeyRef       = useRef(null);
  const audioCtxRef         = useRef(null);
  const handleScanResultRef = useRef(null);

  const cat = selectedCat ? categories[selectedCat] : null;
  const CatIcon = cat ? (LucideIcons[cat.icon] || Package) : Package;

  const subCatsWithItems = selectedCat
    ? (cat?.subcategories || []).filter(sub =>
        items.some(i => i.category === selectedCat && i.subcategory === sub)
      )
    : [];

  const listItems = items.filter(
    i => i.category === selectedCat && i.subcategory === selectedSub
  );

  const serialRows = listItems.flatMap(item =>
    (item.serials || []).map(serial => ({
      serial,
      serialLower: serial.toLowerCase(),
      item,
      scanned: scannedSerialsRef.current.has(serial.toLowerCase()),
    }))
  ).sort((a, b) => {
    if (a.scanned === b.scanned) return 0;
    return a.scanned ? 1 : -1;
  });

  const filtered = searchQ === '__missing__'
    ? serialRows.filter(r => !r.scanned)
    : searchQ.trim()
    ? serialRows.filter(r =>
        r.serial.toLowerCase().includes(searchQ.toLowerCase()) ||
        r.item.name.toLowerCase().includes(searchQ.toLowerCase())
      )
    : serialRows;

  const totalSerials = serialRows.length;
  const scannedCount = scannedSerialsRef.current.size;

  // ── เสียง beep ───────────────────────────────────────────────
  const beep = useCallback((type = 'found') => {
    try {
      const src = type === 'found'     ? '/sounds/beep-found.mp3'
                : type === 'duplicate' ? '/sounds/beep-duplicate.mp3'
                :                        '/sounds/beep-error.mp3';
      const audio = new Audio(src);
      audio.volume = 0.8;
      audio.play().catch(() => {
        try {
          if (!audioCtxRef.current)
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
          const ctx = audioCtxRef.current;
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'square';
          o.frequency.value = type === 'found' ? 3800 : type === 'duplicate' ? 2400 : 1200;
          g.gain.setValueAtTime(0.4, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.1);
        } catch {}
      });
    } catch {}
  }, []);

  const handleScanResult = useCallback((code) => {
    const codeLower = code.toLowerCase().trim();
    if (!codeLower) return;

    // ── หา serial ที่ตรงกัน ──────────────────────────────────────
    // 1. exact match ก่อน
    // 2. ถ้าพิมพ์ >= 4 ตัว → partial match (contains)
    const findSerial = (items, query) => {
      // exact match
      const exact = items.find(i =>
        Array.isArray(i.serials) && i.serials.some(s => s.toLowerCase() === query)
      );
      if (exact) return { item: exact, matchedSerial: query };

      // partial match — พิมพ์ >= 4 ตัว → endsWith ก่อน แล้วค่อย contains
      if (query.length >= 4) {
        for (const item of items) {
          if (!Array.isArray(item.serials)) continue;
          // ลอง endsWith ก่อน (แม่นกว่า)
          const endMatch = item.serials.find(s => s.toLowerCase().endsWith(query));
          if (endMatch) return { item, matchedSerial: endMatch.toLowerCase() };
        }
        for (const item of items) {
          if (!Array.isArray(item.serials)) continue;
          // fallback: contains
          const anyMatch = item.serials.find(s => s.toLowerCase().includes(query));
          if (anyMatch) return { item, matchedSerial: anyMatch.toLowerCase() };
        }
      }
      return null;
    };

    // ตรวจ duplicate — ทั้ง exact และ partial
    const alreadyScanned = [...scannedSerialsRef.current].some(s =>
      s === codeLower || (codeLower.length >= 4 && s.includes(codeLower))
    );
    if (alreadyScanned) {
      beep('duplicate');
      const found = listItems.find(i =>
        Array.isArray(i.serials) && i.serials.some(s => s.toLowerCase() === codeLower || s.toLowerCase().includes(codeLower))
      );
      setScanResult({ serial: code, item: found, status: 'duplicate' });
      setTimeout(() => setScanResult(null), 1500);
      return;
    }

    const result = findSerial(listItems, codeLower);
    if (result) {
      const { item: found, matchedSerial } = result;
      beep('found');
      // บันทึก serial ที่ตรงเต็มๆ ไม่ใช่สิ่งที่พิมพ์
      scannedSerialsRef.current = new Set([...scannedSerialsRef.current, matchedSerial]);
      setScannedSerials(new Set(scannedSerialsRef.current));
      setScanResult({ serial: matchedSerial, item: found, status: 'found' });
      setTimeout(() => setScanResult(null), 1200);
      if (sessionKeyRef.current) {
        fetch(`/api/scan-session/${sessionKeyRef.current}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serial: matchedSerial })
        }).catch(() => {});
      }
      setTimeout(() => {
        document.getElementById(`serial-${matchedSerial}`)?.scrollIntoView({
          behavior: 'smooth', block: 'center'
        });
      }, 100);
    } else {
      beep('error');
      setScanResult({ serial: code, item: null, status: 'notfound' });
      setTimeout(() => setScanResult(null), 1500);
    }
  }, [listItems, beep]);

  useEffect(() => { handleScanResultRef.current = handleScanResult; }, [handleScanResult]);

  useEffect(() => {
    if (!gunMode) return;
    const onKeyDown = (e) => {
      if (e.key === 'Enter') {
        const buf = gunBufferRef.current.trim();
        if (buf.length >= 3) handleScanResultRef.current?.(buf);
        gunBufferRef.current = '';
        clearTimeout(gunTimerRef.current);
        return;
      }
      if (e.key.length === 1) {
        gunBufferRef.current += e.key;
        clearTimeout(gunTimerRef.current);
        gunTimerRef.current = setTimeout(() => { gunBufferRef.current = ''; }, 200);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gunMode]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (codeReaderRef.current?.reset) codeReaderRef.current.reset();
    setScanMode(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      codeReaderRef.current = reader;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      setScanMode(true);
      await new Promise(r => setTimeout(r, 100));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const result = await reader.decodeFromVideoElement(videoRef.current);
          if (result && !scanCooldownRef.current) {
            scanCooldownRef.current = true;
            handleScanResultRef.current?.(result.getText());
            setTimeout(() => { scanCooldownRef.current = false; }, 1000);
          }
        } catch {}
        rafIdRef.current = requestAnimationFrame(scan);
      };
      rafIdRef.current = requestAnimationFrame(scan);
    } catch (err) {
      console.error('Camera error:', err);
      setScanMode(false);
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (selectedCat && selectedSub) {
      sessionKeyRef.current = makeLockKey(selectedCat, selectedSub);
      fetch(`/api/scan-session/${sessionKeyRef.current}`)
        .then(r => r.json())
        .then(({ serials }) => {
          if (Array.isArray(serials) && serials.length > 0) {
            const s = new Set(serials);
            scannedSerialsRef.current = s;
            setScannedSerials(new Set(s));
          }
        })
        .catch(() => {});
    }
  }, [selectedCat, selectedSub]);

  useEffect(() => {
    if (!sessionKeyRef.current) return;
    fetch(`/api/count-lock/${sessionKeyRef.current}`)
      .then(r => r.json())
      .then(({ locked }) => setIsLocked(!!locked))
      .catch(() => {});
  }, [selectedCat, selectedSub]);

  const handleAddManual = useCallback((raw) => {
    const codes = raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    codes.forEach(c => handleScanResultRef.current?.(c));
    setManualInput('');
  }, []);

  const handleReset = useCallback(() => {
    scannedSerialsRef.current = new Set();
    setScannedSerials(new Set());
    setSavedCount(0);
    setNote('');
    if (sessionKeyRef.current) {
      fetch(`/api/scan-session/${sessionKeyRef.current}`, { method: 'DELETE' }).catch(() => {});
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (scannedSerialsRef.current.size === 0) return;
    setSaving(true);
    try {
      let count = 0;
      for (const item of listItems) {
        const allItemSerials = item.serials || [];
        const scannedForItem = allItemSerials.filter(s =>
          scannedSerialsRef.current.has(s.toLowerCase())
        );
        // ใช้จำนวน serial ในระบบเป็น qBefore
        const qBefore = allItemSerials.length || item.quantity;
        const qAfter  = scannedForItem.length;
        // ข้ามเฉพาะ item ที่ไม่มี serial เลยและไม่ได้นับ
        if (allItemSerials.length === 0 && scannedForItem.length === 0) continue;
        // ไม่อัปเดต quantity ในคลัง — แค่บันทึกประวัติว่านับได้เท่าไหร่
        // serial ที่ขาด = อยู่ในระบบแต่ไม่ถูกสแกน
        const missingSerials = allItemSerials.filter(s =>
          !scannedSerialsRef.current.has(s.toLowerCase())
        );
        addHistoryEntry({
          type: 'update',
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          subcategory: item.subcategory,
          quantityBefore: qBefore,
          quantityAfter: qAfter,
          priceBefore: item.price,
          priceAfter: item.price,
          counter: currentUser?.name || 'ไม่ระบุ',
          note: note || 'นับสต๊อก',
          scannedSerials: scannedForItem,
          missingSerials,
        });
        count++;
      }
      setSavedCount(count);
      if (sessionKeyRef.current) {
        await fetch(`/api/count-lock/${sessionKeyRef.current}`, { method: 'POST' }).catch(() => {});
      }
      setIsLocked(true);
      // อัปเดต lockedSubs ให้ sync ทันที
      if (selectedCat && selectedSub) {
        const lockKey = makeLockKey(selectedCat, selectedSub);
        setLockedSubs(prev => {
          const next = new Set([...prev, lockKey]);
          onLockChange?.(next); // sync กลับ App.jsx สำหรับ Dashboard progress
          return next;
        });
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }, [listItems, note, currentUser, addHistoryEntry]);

  const goBack = useCallback(() => {
    if (step === 'scan') {
      stopCamera();
      setStep('subcategory');
      setScannedSerials(new Set());
      scannedSerialsRef.current = new Set();
      setSavedCount(0);
      setNote('');
      setSearchQ('');
    } else if (step === 'subcategory') {
      setStep('category');
      setSelectedCat(null);
    }
  }, [step, stopCamera]);

  // ── Unlock confirm modal ─────────────────────────────────────
  const doUnlock = async () => {
    if (!unlockTarget) return;
    try {
      await fetch(`/api/count-lock/${unlockTarget.key}`, { method: 'DELETE' });
      setLockedSubs(prev => {
        const next = new Set(prev);
        next.delete(unlockTarget.key);
        onLockChange?.(next);
        return next;
      });
    } catch {}
    setUnlockTarget(null);
  };

  // ── Step: category ────────────────────────────────────────────
  if (step === 'category') {
    const activeCats = Object.entries(categories).filter(([key]) =>
      items.some(i => i.category === key)
    );

    // Skeleton loading ตอนรอข้อมูล
    if (items.length === 0) {
      return (
        <div className="space-y-4 overflow-y-auto p-4 md:p-6">
          <div className="h-8 w-56 bg-slate-700 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 animate-pulse">
                <div className="w-12 h-12 bg-slate-700 rounded-xl mx-auto mb-3" />
                <div className="h-4 bg-slate-700 rounded mx-auto w-3/4 mb-2" />
                <div className="h-3 bg-slate-700 rounded mx-auto w-1/2" />
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4 overflow-y-auto p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
          นับสต๊อก — เลือกหมวดหมู่
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activeCats.map(([key, cat]) => {
            const Icon = LucideIcons[cat.icon] || Package;
            const count = items.filter(i => i.category === key).length;
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedCat(key);
                  setStep('subcategory');
                  // refresh lock ของ category นี้ใน background
                  // merge กับ lockedSubs ที่โหลดมาแล้วตอน mount
                  const subs = cat.subcategories || [];
                  Promise.all(
                    subs.map(sub =>
                      fetch(`/api/count-lock/${makeLockKey(key, sub)}`)
                        .then(r => r.json())
                        .then(d => d.locked ? makeLockKey(key, sub) : null)
                        .catch(() => null)
                    )
                  ).then(locks => {
                    const found = locks.filter(Boolean);
                    setLockedSubs(prev => {
                      const next = new Set(prev);
                      found.forEach(k => next.add(k));
                      return next;
                    });
                  }).catch(() => {});
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 rounded-2xl p-4 text-center transition-all"
              >
                <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-400" />
                </div>
                <p className="font-medium text-sm leading-tight">{cat.name}</p>
                <p className="text-xs text-slate-500 mt-1">{count} รายการ</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step: subcategory ─────────────────────────────────────────
  if (step === 'subcategory') {
    return (
      <div className="space-y-4 overflow-y-auto p-4 md:p-6">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 hover:bg-slate-700 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {cat && <CatIcon className="w-5 h-5 text-blue-400" />}
            {getCatLabel(selectedCat)} — เลือกหมวดย่อย
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subCatsWithItems.map(sub => {
            const subItems = items.filter(i => i.category === selectedCat && i.subcategory === sub);
            const totalQ = subItems.reduce((s, i) => s + (i.serials?.length || i.quantity), 0);
            const lockKey = makeLockKey(selectedCat, sub);
            const isSubLocked = lockedSubs.has(lockKey);
            const handleUnlock = (e) => {
              e.stopPropagation();
              setUnlockTarget({ key: lockKey, name: sub });
            };

            return (
              <div key={sub} className={`rounded-2xl border transition-all ${
                isSubLocked
                  ? 'bg-slate-800/40 border-slate-700/50'
                  : 'bg-slate-800 border-slate-700'
              }`}>
                <button
                  disabled={isSubLocked}
                  onClick={() => {
                    if (isSubLocked) return;
                    setSelectedSub(sub);
                    setStep('scan');
                  }}
                  className={`w-full p-4 flex items-center gap-4 text-left transition-all rounded-2xl ${
                    isSubLocked
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:bg-slate-700 hover:border-blue-500/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSubLocked ? 'bg-emerald-500/10' : 'bg-blue-500/10'
                  }`}>
                    {isSubLocked
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      : <Package className="w-5 h-5 text-blue-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isSubLocked ? 'text-slate-400' : ''}`}>{sub}</p>
                    <p className="text-sm text-slate-500">{subItems.length} รายการ · {totalQ} ชิ้น</p>
                    {isSubLocked && (
                      <p className="text-xs text-emerald-400 mt-0.5">✓ นับแล้ว</p>
                    )}
                  </div>
                  {!isSubLocked && <ChevronRight className="w-4 h-4 text-slate-500 ml-auto shrink-0" />}
                </button>
                {/* ปุ่มปลดล็อค — แสดงเฉพาะตอนล็อค */}
                {isSubLocked && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={handleUnlock}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-amber-500/20 hover:text-amber-400 text-slate-400 rounded-lg text-xs font-medium transition-all border border-slate-600 hover:border-amber-500/40"
                    >
                      <RotateCcw className="w-3 h-3" />
                      ปลดล็อคเพื่อนับใหม่
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom unlock confirm modal */}
      {unlockTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="font-bold text-lg mb-1">ปลดล็อคเพื่อนับใหม่?</h3>
            <p className="text-slate-400 text-sm mb-5">
              หมวดหมู่ <span className="text-white font-medium">"{unlockTarget.name}"</span> จะถูกปลดล็อคและสามารถนับสต็อกใหม่ได้
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUnlockTarget(null)}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={doUnlock}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                ปลดล็อค
              </button>
            </div>
          </div>
        </div>
      )}
    );
  }

  // ── Step: scan ────────────────────────────────────────────────
  // mobile  : เลื่อนทั้งหน้าได้ (overflow-y-auto, ไม่ fixed height)
  // desktop : absolute inset-0 → fixed height → serial list scroll ข้างใน
  return (
    <div className="
      flex flex-col gap-4 p-4
      overflow-y-auto
      lg:absolute lg:inset-0 lg:flex-row lg:p-6 lg:overflow-hidden
    ">

      {/* Main panel */}
      <div className="
        flex flex-col bg-slate-800 border border-slate-700 rounded-2xl p-4
        lg:flex-1 lg:min-h-0 lg:overflow-hidden
      ">

        {/* Header */}
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <button onClick={goBack} className="p-2 hover:bg-slate-700 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400">{getCatLabel(selectedCat)}</p>
            <p className="font-bold truncate">{selectedSub}</p>
          </div>
          {isLocked && (
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-lg border border-emerald-500/30 shrink-0">
              ✓ บันทึกแล้ว
            </span>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
          <div className="relative flex-1 min-w-[120px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="ค้นหา..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}
          </div>
          <button
            onClick={() => scanMode ? stopCamera() : startCamera()}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium shrink-0 transition-all border ${
              scanMode
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}
          >
            {scanMode ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            <span className="hidden sm:inline">{scanMode ? 'ปิดกล้อง' : 'กล้อง'}</span>
          </button>
          <div
            onClick={() => setGunMode(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border shrink-0 cursor-pointer transition-all ${
              gunMode
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span className="hidden sm:inline">{gunMode ? 'ยิงอยู่' : 'เครื่องยิง'}</span>
            {gunMode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </div>
          <span className="text-slate-500 text-sm shrink-0">{filtered.length} รายการ</span>
          {/* ปุ่ม filter เฉพาะที่ยังไม่ได้สแกน */}
          {scannedCount > 0 && totalSerials - scannedCount > 0 && (
            <button
              onClick={() => setSearchQ(searchQ === '__missing__' ? '' : '__missing__')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border shrink-0 transition-all ${
                searchQ === '__missing__'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'
              }`}
            >
              ขาด {totalSerials - scannedCount}
            </button>
          )}
        </div>

        {/* Manual input */}
        <details className="mb-3 group shrink-0">
          <summary className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-400 cursor-pointer hover:text-white list-none">
            <span className="flex-1">พิมพ์ Serial (คั่นด้วย , หรือ Enter)</span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-1 bg-slate-800 border border-slate-700 rounded-xl p-2 flex gap-2">
            <textarea
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleAddManual(manualInput);
              }}
              placeholder="พิมพ์ 4+ ตัว เช่น 6902, H208..."
              className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-10 font-mono"
            />
            <button
              onClick={() => handleAddManual(manualInput)}
              className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-all whitespace-nowrap self-end"
            >
              เพิ่ม
            </button>
          </div>
        </details>

        {/* Camera */}
        {scanMode && (
          <div className="relative mb-3 rounded-2xl overflow-hidden bg-black border border-slate-700 shrink-0">
            <video ref={videoRef} className="w-full max-h-48 object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-24 border-2 border-blue-400 rounded-lg opacity-70" />
            </div>
            {scanResult && (
              <div className={`absolute inset-0 flex items-center justify-center ${
                scanResult.status === 'found'      ? 'bg-emerald-500/30'
                : scanResult.status === 'duplicate' ? 'bg-amber-500/30'
                :                                     'bg-red-500/30'
              }`}>
                <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                  scanResult.status === 'found'      ? 'bg-emerald-500 text-white'
                  : scanResult.status === 'duplicate' ? 'bg-amber-500 text-white'
                  :                                     'bg-red-500 text-white'
                }`}>
                  {scanResult.status === 'found'      ? `✓ ${scanResult.item?.name}`
                  : scanResult.status === 'duplicate'  ? `⚠ ซ้ำ: ${scanResult.serial}`
                  :                                      `ไม่พบ: ${scanResult.serial}`}
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-slate-400">
              <Zap className="w-3 h-3 inline mr-1 text-blue-400" />หันกล้องไปที่ barcode
            </div>
          </div>
        )}

        {/* Serial list — desktop: flex-1 scroll, mobile: ความสูงตามเนื้อหา */}
        <div className="space-y-1.5 pr-1 lg:flex-1 lg:overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
              ไม่พบรายการ
            </div>
          )}
          {filtered.map((row, idx) => (
            <div
              id={`serial-${row.serialLower}`}
              key={row.serial}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                scanResult?.serial?.toLowerCase() === row.serialLower
                  ? scanResult.status === 'duplicate'
                    ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/50'
                    : 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50'
                  : row.scanned
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-slate-800/60 border-slate-700/60'
              }`}
            >
              <span className="text-slate-600 text-xs w-5 shrink-0 text-right">{idx + 1}</span>
              <div className="shrink-0">
                {row.scanned
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  : <div className="w-4 h-4 rounded-full border border-slate-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-slate-300 leading-tight">{row.serial}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{row.item.name}</p>
              </div>
              {row.scanned && <span className="text-xs text-emerald-400 font-medium shrink-0">นับแล้ว</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Side panel — mobile: full width, desktop: fixed 288px */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
            <span className="text-slate-400">
              หมวด: <span className="text-blue-300 font-medium">{selectedSub}</span>
            </span>
            <div className="flex gap-3">
              <span className="text-slate-400">สแกน: <span className="font-bold text-emerald-400">{scannedCount}</span></span>
              <span className="text-slate-400">ทั้งหมด: <span className="font-bold text-white">{totalSerials}</span></span>
              <span className="text-slate-400">
                เหลือ: <span className={`font-bold ${totalSerials - scannedCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {totalSerials - scannedCount}
                </span>
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: totalSerials > 0 ? `${(scannedCount / totalSerials) * 100}%` : '0%' }}
            />
          </div>

          {/* Note + save */}
          <div className="flex gap-2">
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="บันทึก..."
              className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSave}
              disabled={saving || scannedCount === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 rounded-lg font-semibold text-xs transition-all whitespace-nowrap"
            >
              {saving
                ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-3 h-3" />
                : <Send className="w-3 h-3" />}
              บันทึก {scannedCount} ชิ้น
            </button>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-1 text-slate-500 hover:text-white text-xs transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> รีเซ็ต
          </button>
        </div>

        {savedCount > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">
            <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4" />บันทึกแล้ว {savedCount} รายการ
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
