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

const CAT_LABELS = {
  hardware:'ฮาร์ดแวร์', accessories:'อุปกรณ์เสริม', monitors:'จอมอนิเตอร์',
  networking:'อุปกรณ์เครือข่าย', software:'ซอฟต์แวร์', storage:'อุปกรณ์จัดเก็บ',
  notebook:'โน้ตบุ๊ก', peripherals:'อุปกรณ์ต่อพ่วง', Printer:'Printer & Ink', misc:'อุปกรณ์อื่นๆ',
};
const getCatLabel = (key) => CAT_LABELS[key] || key;

export default function StockCount() {
  const { items } = useStock();
  const { currentUser } = useUser();
  const { addHistoryEntry } = useHistory();

  // ── State ────────────────────────────────────────────────────
  const [step, setStep]               = useState("category");
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
  const [scanFlash, setScanFlash]     = useState(false);

  // ── Refs ─────────────────────────────────────────────────────
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

  // ── Computed ─────────────────────────────────────────────────
  const cat = selectedCat
    ? (Array.isArray(categories)
        ? categories.find(c => c.name === selectedCat)
        : categories[selectedCat])
    : null;
  const CatIcon = cat ? (LucideIcons[cat.icon] || Package) : Package;

  const subCatsWithItems = selectedCat
    ? (() => {
        const subs = cat?.subcategories || cat?.items?.map(i => i.name) || [];
        return subs.filter(sub => items.some(i => i.category === selectedCat && i.subcategory === sub));
      })()
    : [];

  const listItems = items.filter(i => i.category === selectedCat && i.subcategory === selectedSub);

  // sort: ยังไม่นับขึ้นบน นับแล้วลงล่าง — ใช้ ref เพื่อ sync ทันที
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

  const filtered = searchQ.trim()
    ? serialRows.filter(r =>
        r.serial.toLowerCase().includes(searchQ.toLowerCase()) ||
        r.item.name.toLowerCase().includes(searchQ.toLowerCase())
      )
    : serialRows;

  const totalSerials = serialRows.length;
  const scannedCount = scannedSerialsRef.current.size;

  // ── เสียง beep (mp3 + Web Audio fallback) ────────────────────
  const beep = useCallback((type = 'found') => {
    try {
      const src = type === 'found' ? '/sounds/beep-found.mp3'
                : type === 'duplicate' ? '/sounds/beep-duplicate.mp3'
                : '/sounds/beep-error.mp3';
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

  // ── handleScanResult ─────────────────────────────────────────
  const handleScanResult = useCallback((code) => {
    const codeLower = code.toLowerCase();
    if (scannedSerialsRef.current.has(codeLower)) {
      beep('duplicate');
      const item = listItems.find(i => Array.isArray(i.serials) && i.serials.some(s => s.toLowerCase() === codeLower));
      setScanResult({ serial: code, item, status: 'duplicate' });
      setTimeout(() => setScanResult(null), 1500);
      return;
    }
    // ค้นหาเฉพาะใน subcategory ที่เลือกอยู่เท่านั้น
    const found = listItems.find(i => Array.isArray(i.serials) && i.serials.some(s => s.toLowerCase() === codeLower));
    if (found) {
      beep('found');
      scannedSerialsRef.current = new Set(scannedSerialsRef.current);
      scannedSerialsRef.current.add(codeLower);
      setScannedSerials(new Set(scannedSerialsRef.current));
      if (sessionKeyRef.current) {
        fetch(`/api/scan-session/${sessionKeyRef.current}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serial: codeLower }),
        }).catch(() => {});
      }
      setScanResult({ serial: code, item: found, status: 'found' });
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 600);
      setTimeout(() => {
        document.getElementById(`serial-${codeLower}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    } else {
      beep('notfound');
      setScanResult({ serial: code, item: null, status: 'notfound' });
    }
    setTimeout(() => setScanResult(null), 1500);
  }, [items, listItems, beep]);

  // อัปเดต ref ให้ camera/gun ใช้ version ล่าสุดเสมอ
  useEffect(() => { handleScanResultRef.current = handleScanResult; }, [handleScanResult]);

  // ── Camera ───────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setScanMode(true);
    } catch (err) {
      alert('ไม่สามารถเปิดกล้องได้: ' + err.message);
    }
  };

  useEffect(() => {
    if (!scanMode || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.setAttribute('playsinline', 'true');
    video.muted = true;
    video.play().catch(() => {});

    let cancelled = false;

    const initScanner = async () => {
      try {
        if ('BarcodeDetector' in window) {
          // Android Chrome — Native BarcodeDetector
          const detector = new window.BarcodeDetector({
            formats: ['code_128','code_39','ean_13','ean_8','qr_code','upc_a','upc_e','itf','codabar','data_matrix'],
          });
          const loop = async () => {
            if (cancelled) return;
            if (video.readyState >= 2 && !scanCooldownRef.current) {
              try {
                const barcodes = await detector.detect(video);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  scanCooldownRef.current = true;
                  handleScanResultRef.current?.(barcodes[0].rawValue);
                  setTimeout(() => { scanCooldownRef.current = false; }, 1500);
                }
              } catch {}
            }
            rafIdRef.current = requestAnimationFrame(loop);
          };
          rafIdRef.current = requestAnimationFrame(loop);
        } else {
          // iOS Safari — @zxing/library canvas decode loop + TRY_HARDER
          const { MultiFormatReader, BinaryBitmap, HTMLCanvasElementLuminanceSource,
                  HybridBinarizer, DecodeHintType, BarcodeFormat } = await import('@zxing/library');
          const hints = new Map();
          hints.set(DecodeHintType.TRY_HARDER, true);
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
            BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E, BarcodeFormat.ITF, BarcodeFormat.CODABAR,
            BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
          ]);
          const reader = new MultiFormatReader();
          reader.setHints(hints);
          codeReaderRef.current = { reset: () => { cancelled = true; } };
          const canvas = document.createElement('canvas');
          const ctx2d = canvas.getContext('2d', { willReadFrequently: true });
          const loop = () => {
            if (cancelled) return;
            if (video.readyState >= 2 && !scanCooldownRef.current) {
              try {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
                const src = new HTMLCanvasElementLuminanceSource(canvas);
                const bmp = new BinaryBitmap(new HybridBinarizer(src));
                const result = reader.decode(bmp);
                if (result) {
                  scanCooldownRef.current = true;
                  handleScanResultRef.current?.(result.getText());
                  setTimeout(() => { scanCooldownRef.current = false; }, 1500);
                }
              } catch {}
            }
            rafIdRef.current = requestAnimationFrame(loop);
          };
          rafIdRef.current = requestAnimationFrame(loop);
        }
      } catch (err) {
        if (!cancelled) { console.error('Scanner error:', err); setScanMode(false); }
      }
    };

    initScanner();

    return () => {
      cancelled = true;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      codeReaderRef.current?.reset?.();
      codeReaderRef.current = null;
    };
  }, [scanMode]);

  const stopCamera = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    codeReaderRef.current?.reset?.();
    codeReaderRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanMode(false);
    setScanResult(null);
  };

  // ── Browser back: pushState ทุก step ───────────────────────
  const pushCountState = useCallback((s, cat=null, sub=null) => {
    window.history.pushState({ view:'count', countStep:s, countCat:cat, countSub:sub }, '', '#count')
  }, [])

  // push เมื่อเลือก cat หรือ sub (ไม่ใช่ตอน mount)
  const prevStepRef = useRef(null)
  useEffect(() => {
    if (prevStepRef.current === null) { prevStepRef.current = step; return }
    if (step !== prevStepRef.current) {
      prevStepRef.current = step
      pushCountState(step, selectedCat, selectedSub)
    }
  }, [step, selectedCat, selectedSub, pushCountState])

  useEffect(() => {
    const onPop = (e) => {
      const s = e.state
      if (!s || s.view !== 'count') return
      // ย้อน step ตาม countStep ที่อยู่ใน state
      if (s.countStep === 'subcategory') {
        stopCamera()
        setStep('subcategory')
        setSelectedSub(null)
      } else if (s.countStep === 'category') {
        stopCamera()
        setStep('category')
        setSelectedCat(null)
        setSelectedSub(null)
      }
      // ถ้าไม่มี countStep → App.jsx จัดการเอง (กลับหน้าก่อน count)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // ── Barcode Gun ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'count' || !gunMode) return;
    const onKey = (e) => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'Enter') {
        const code = gunBufferRef.current.trim();
        gunBufferRef.current = '';
        if (code) handleScanResultRef.current?.(code);
      } else if (e.key.length === 1) {
        gunBufferRef.current += e.key;
        clearTimeout(gunTimerRef.current);
        gunTimerRef.current = setTimeout(() => { gunBufferRef.current = ''; }, 100);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, gunMode]);

  // ── Session ───────────────────────────────────────────────────
  const handleSelectCat = (key) => {
    setSelectedCat(key);
    setSelectedSub(null);
    setSavedCount(0);
    setStep("subcategory");
  };

  const handleSelectSub = (sub) => {
    setSelectedSub(sub);
    setSearchQ("");
    setStep("count");
    setIsLocked(false);
    const today = new Date().toISOString().slice(0, 10);
    const key = `scan_${selectedCat}_${sub}_${today}`.replace(/[/\s]/g, '_');
    sessionKeyRef.current = key;
    // โหลด session + เช็ค lock พร้อมกัน
    Promise.all([
      fetch(`/api/scan-session/${key}`).then(r => r.json()).catch(() => ({ serials: [] })),
      fetch(`/api/count-lock/${key}`).then(r => r.json()).catch(() => ({ locked: false })),
    ]).then(([sessionData, lockData]) => {
      const s = new Set(sessionData.serials || []);
      scannedSerialsRef.current = s;
      setScannedSerials(new Set(s));
      setIsLocked(!!lockData.locked);
    });
  };

  const handleBack = () => {
    stopCamera();
    if (step === "count") { setStep("subcategory"); setSelectedSub(null); }
    else if (step === "subcategory") { setStep("category"); setSelectedCat(null); }
  };

  const handleAddManual = (text) => {
    setManualInput('');
    text.split(/[,\n]/).map(s => s.trim()).filter(Boolean).forEach(input => {
      // ถ้า input สั้น (≤ 6 ตัว) → ลอง match 4 ตัวท้ายของ serial ใน listItems
      if (input.length <= 6) {
        const inputLower = input.toLowerCase();
        const matchedSerial = listItems
          .flatMap(i => i.serials || [])
          .find(s => s.toLowerCase().endsWith(inputLower));
        if (matchedSerial) {
          handleScanResultRef.current?.(matchedSerial);
          return;
        }
      }
      handleScanResultRef.current?.(input);
    });
  };

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (scannedSerialsRef.current.size === 0) return;
    setSaving(true);
    const countByItem = {};
    for (const s of scannedSerialsRef.current) {
      const item = items.find(i => Array.isArray(i.serials) && i.serials.some(sr => sr.toLowerCase() === s));
      if (item) countByItem[item.id] = (countByItem[item.id] || 0) + 1;
    }
    for (const item of listItems) {
      addHistoryEntry({
        type: "update",
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        subcategory: item.subcategory,
        quantityBefore: item.quantity,
        quantityAfter: countByItem[item.id] ?? 0,
        priceBefore: item.price,
        priceAfter: item.price,
        counter: currentUser?.name || "ไม่ระบุ",
        note: note || `นับสต๊อก ${getCatLabel(selectedCat)}`,
      });
    }
    setSavedCount(listItems.length);
    setSaving(false);
    setNote("");
    if (sessionKeyRef.current) {
      fetch(`/api/scan-session/${sessionKeyRef.current}`, { method: 'DELETE' }).catch(() => {});
      // ล็อค — ป้องกันนับซ้ำจนกว่าจะลบประวัติ
      fetch(`/api/count-lock/${sessionKeyRef.current}`, { method: 'POST' }).catch(() => {});
    }
    scannedSerialsRef.current = new Set();
    setScannedSerials(new Set());
    setIsLocked(true);
  };

  const handleReset = () => {
    if (sessionKeyRef.current) {
      fetch(`/api/scan-session/${sessionKeyRef.current}`, { method: 'DELETE' }).catch(() => {});
    }
    scannedSerialsRef.current = new Set();
    setScannedSerials(new Set());
    setSavedCount(0);
    // สร้าง key ใหม่สำหรับรอบนับใหม่
    if (selectedCat && selectedSub) {
      const today = new Date().toISOString().slice(0, 10);
      const key = `scan_${selectedCat}_${selectedSub}_${today}_r${Date.now()}`.replace(/[/\s]/g, '_');
      sessionKeyRef.current = key;
    }
  };

  // ── UI ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-0 relative">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm flex-wrap">
        <ClipboardCheck className="w-5 h-5 text-blue-400 shrink-0" />
        <button onClick={() => { stopCamera(); setStep("category"); setSelectedCat(null); setSelectedSub(null); }}
          className={`font-semibold ${step === "category" ? "text-white" : "text-slate-400 hover:text-white"}`}>
          นับสต๊อก
        </button>
        {selectedCat && (<>
          <ChevronRight className="w-4 h-4 text-slate-600" />
          <button onClick={() => { stopCamera(); if (step === "count") { setStep("subcategory"); setSelectedSub(null); } }}
            className={`font-semibold ${step === "subcategory" ? "text-white" : "text-slate-400 hover:text-white"}`}>
            {getCatLabel(selectedCat)}
          </button>
        </>)}
        {selectedSub && (<>
          <ChevronRight className="w-4 h-4 text-slate-600" />
          <span className="text-white font-semibold">{selectedSub}</span>
        </>)}
        <div className="ml-auto text-slate-500 text-xs">
          ผู้นับ: <span className="text-blue-300 font-medium">{currentUser?.name}</span>
        </div>
      </div>

      {/* Step 1: เลือกหมวดหลัก */}
      {step === "category" && (
        <div className="flex-1 overflow-y-auto">
          <p className="text-slate-400 text-sm mb-4">เลือกหมวดสินค้าที่จะนับสต๊อก</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(Array.isArray(categories)
              ? categories
              : Object.entries(categories).map(([k,v]) => ({ ...v, name: k }))
            ).map((catObj) => {
              const Icon = LucideIcons[catObj.icon] || Package;
              const catItems = items.filter(i => i.category === catObj.name);
              if (catItems.length === 0) return null;
              return (
                <button key={catObj.name} onClick={() => handleSelectCat(catObj.name)}
                  className="flex flex-col items-start gap-2 p-4 bg-slate-800 border border-slate-700 hover:border-blue-500 hover:bg-slate-700/80 rounded-2xl transition-all text-left group">
                  <div className="w-10 h-10 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{catObj.label || getCatLabel(catObj.name)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{catItems.length} รายการ</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 self-end" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: เลือกหมวดย่อย */}
      {step === "subcategory" && (
        <div className="flex-1 overflow-y-auto">
          <button onClick={handleBack} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4">
            <ChevronLeft className="w-4 h-4" /> กลับ
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subCatsWithItems.map(sub => {
              const subItems = items.filter(i => i.category === selectedCat && i.subcategory === sub);
              return (
                <button key={sub} onClick={() => handleSelectSub(sub)}
                  className="flex items-center gap-4 p-4 bg-slate-800 border border-slate-700 hover:border-blue-500 hover:bg-slate-700/80 rounded-2xl transition-all text-left group">
                  <div className="w-10 h-10 bg-slate-700 group-hover:bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <CatIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{sub}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{subItems.length} รายการ · {subItems.reduce((s,i) => s+i.quantity,0)} ชิ้น</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: นับรายการ */}
      {step === "count" && (
        <>
          {/* Locked Overlay */}
          {isLocked && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-2xl">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <p className="text-white font-bold text-lg mb-1">นับเสร็จแล้ว</p>
                <p className="text-slate-400 text-sm mb-1">{selectedSub}</p>
                <p className="text-slate-500 text-xs mb-4">ลบประวัติการนับเพื่อนับใหม่</p>
                <button onClick={handleBack}
                  className="flex items-center gap-1.5 mx-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-all">
                  <ChevronLeft className="w-4 h-4" /> กลับ
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden min-h-0">
            {/* รายการ */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <button onClick={handleBack} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm shrink-0">
                  <ChevronLeft className="w-4 h-4" /> กลับ
                </button>
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    placeholder="ค้นหา..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {searchQ && (
                    <button onClick={() => setSearchQ("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  )}
                </div>
                <button onClick={() => scanMode ? stopCamera() : startCamera()}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium shrink-0 transition-all ${
                    scanMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                  {scanMode ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                  <span className="hidden sm:inline">{scanMode ? 'ปิดกล้อง' : 'กล้อง'}</span>
                </button>
                <div onClick={() => setGunMode(p => !p)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border shrink-0 cursor-pointer transition-all ${
                    gunMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'}`}>
                  <Scan className="w-4 h-4" />
                  <span className="hidden sm:inline">{gunMode ? 'ยิงอยู่' : 'เครื่องยิง'}</span>
                  {gunMode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </div>
                <span className="text-slate-500 text-sm shrink-0">{filtered.length} รายการ</span>
              </div>

              {/* Manual input — compact collapsible */}
              <details className="mb-3 group">
                <summary className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-400 cursor-pointer hover:text-white list-none">
                  <span className="flex-1">พิมพ์ Serial (คั่นด้วย , หรือ Enter)</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-1 bg-slate-800 border border-slate-700 rounded-xl p-2 flex gap-2">
                  <textarea value={manualInput} onChange={e => setManualInput(e.target.value)}
                    onKeyDown={e => { if ((e.ctrlKey||e.metaKey) && e.key==='Enter') handleAddManual(manualInput); }}
                    placeholder="VT0001, VT0002..."
                    className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-10 font-mono" />
                  <button onClick={() => handleAddManual(manualInput)}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-all whitespace-nowrap self-end">
                    เพิ่ม
                  </button>
                </div>
              </details>

              {/* Camera */}
              {scanMode && (
                <div className="relative mb-3 rounded-2xl overflow-hidden bg-black border border-slate-700">
                  <video ref={videoRef} className="w-full max-h-48 object-cover" playsInline muted />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-24 border-2 border-blue-400 rounded-lg opacity-70" />
                  </div>
                  {scanResult && (
                    <div className={`absolute inset-0 flex items-center justify-center ${
                      scanResult.status==='found' ? 'bg-emerald-500/30' :
                      scanResult.status==='duplicate' ? 'bg-amber-500/30' : 'bg-red-500/30'}`}>
                      <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                        scanResult.status==='found' ? 'bg-emerald-500 text-white' :
                        scanResult.status==='duplicate' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
                        {scanResult.status==='found' ? `✓ ${scanResult.item?.name}` :
                         scanResult.status==='duplicate' ? `⚠ ซ้ำ: ${scanResult.serial}` :
                         `ไม่พบ: ${scanResult.serial}`}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-slate-400">
                    <Zap className="w-3 h-3 inline mr-1 text-blue-400" />หันกล้องไปที่ barcode
                  </div>
                </div>
              )}

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filtered.length === 0 && (
                  <div className="flex items-center justify-center h-40 text-slate-500">ไม่พบรายการ</div>
                )}
                {filtered.map((row, idx) => (
                  <div id={`serial-${row.serialLower}`} key={row.serial}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      scanResult?.serial?.toLowerCase() === row.serialLower
                        ? scanResult.status==='duplicate' ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/50'
                          : 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50'
                        : row.scanned ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-slate-800/60 border-slate-700/60'}`}>
                    <span className="text-slate-600 text-xs w-5 shrink-0 text-right">{idx+1}</span>
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

            {/* Panel สรุป */}
            <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                  <span className="text-slate-400">หมวด: <span className="text-blue-300 font-medium">{selectedSub}</span></span>
                  <div className="flex gap-3">
                    <span className="text-slate-400">สแกน: <span className="font-bold text-emerald-400">{scannedCount}</span></span>
                    <span className="text-slate-400">ทั้งหมด: <span className="font-bold text-white">{totalSerials}</span></span>
                    <span className="text-slate-400">เหลือ: <span className={`font-bold ${totalSerials-scannedCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{totalSerials-scannedCount}</span></span>
                  </div>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all"
                    style={{ width: totalSerials > 0 ? `${(scannedCount/totalSerials)*100}%` : '0%' }} />
                </div>
                <div className="flex gap-2">
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="บันทึก..."
                    className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={handleSave} disabled={saving || scannedCount === 0}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 rounded-lg font-semibold text-xs transition-all whitespace-nowrap">
                    {saving ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-3 h-3" /> : <Send className="w-3 h-3" />}
                    บันทึก {scannedCount} ชิ้น
                  </button>
                </div>
                <button onClick={handleReset}
                  className="flex items-center justify-center gap-1 text-slate-500 hover:text-white text-xs transition-colors">
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
        </>
      )}
    </div>
  );
}
