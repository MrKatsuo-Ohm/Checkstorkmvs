import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  RotateCcw,
  Send,
  Package,
  ClipboardCheck,
  X,
  Search,
  AlertCircle,
  Scan,
  Camera,
  CameraOff,
  Zap,
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
  // scannedSerials: Set of serial strings ที่สแกนแล้ว
  const [scannedSerials, setScannedSerials] = useState(new Set());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const [manualInput, setManualInput] = useState("");

  // Scanner state
  const [scanMode, setScanMode] = useState(false)
  const [gunMode, setGunMode] = useState(false) // เครื่องยิง barcode
  const [scanResult, setScanResult] = useState(null) // { serial, item, status: 'found'|'notfound'|'duplicate' }
  const [scanFlash, setScanFlash] = useState(false)
  const videoRef = useRef(null)
  const codeReaderRef = useRef(null)  // ZXing reader
  const streamRef = useRef(null)
  const scanCooldownRef = useRef(false)
  const gunBufferRef = useRef('')
  const gunTimerRef = useRef(null)
  // ref เพื่อให้ handleScanResult เข้าถึง scannedSerials ล่าสุดเสมอ
  const scannedSerialsRef = useRef(new Set())
  const sessionKeyRef = useRef(null)
  const syncTimerRef = useRef(null)
  const audioCtxRef = useRef(null)

  // Barcode gun: รับ input keyboard เร็วๆ (เฉพาะตอน gunMode เปิด)
  useEffect(() => {
    if (step !== 'count' || !gunMode) return
    const handleKeyDown = (e) => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return
      if (e.key === 'Enter') {
        const code = gunBufferRef.current.trim()
        gunBufferRef.current = ''
        if (code) handleScanResult(code)
      } else if (e.key.length === 1) {
        gunBufferRef.current += e.key
        clearTimeout(gunTimerRef.current)
        gunTimerRef.current = setTimeout(() => { gunBufferRef.current = '' }, 100)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, gunMode, items])

  // Sync scannedSerials ไป API ทุกครั้งที่เปลี่ยน
  useEffect(() => {
    if (step === 'count' && sessionKeyRef.current && scannedSerials.size >= 0) {
      clearTimeout(syncTimerRef.current)
      syncTimerRef.current = setTimeout(() => {
        // ไม่ต้องทำอะไร เพราะ API จะถูกเรียกใน handleScanResult แล้ว
      }, 1000)
    }
  }, [scannedSerials, step])

  // Camera scanner — decode loop ด้วย requestAnimationFrame รองรับ Android & iOS
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setScanMode(true)
    } catch (err) {
      alert('ไม่สามารถเปิดกล้องได้: ' + err.message)
    }
  }

  useEffect(() => {
    if (!scanMode || !videoRef.current || !streamRef.current) return
    const video = videoRef.current
    video.srcObject = streamRef.current
    video.setAttribute('playsinline', 'true')
    video.muted = true
    video.play().catch(() => {})

    let rafId = null
    let cancelled = false
    let detector = null

    const initAndLoop = async () => {
      try {
        // ใช้ BarcodeDetector native ถ้ามี (Android Chrome เร็วกว่ามาก)
        if ('BarcodeDetector' in window) {
          detector = new window.BarcodeDetector({
            formats: ['code_128','code_39','ean_13','ean_8','qr_code','upc_a','upc_e','itf','codabar','data_matrix']
          })
        } else {
          // fallback: ZXing สำหรับ iOS Safari
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          const reader = new BrowserMultiFormatReader()
          codeReaderRef.current = reader
          // ZXing path: ใช้ decodeFromStream แทน loop
          await reader.decodeFromStream(streamRef.current, video, (result) => {
            if (cancelled || !result || scanCooldownRef.current) return
            scanCooldownRef.current = true
            handleScanResult(result.getText())
            setTimeout(() => { scanCooldownRef.current = false }, 1500)
          })
          return
        }

        // Native BarcodeDetector loop
        const loop = async () => {
          if (cancelled) return
          if (video.readyState === video.HAVE_ENOUGH_DATA && !scanCooldownRef.current) {
            try {
              const barcodes = await detector.detect(video)
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                scanCooldownRef.current = true
                handleScanResult(barcodes[0].rawValue)
                setTimeout(() => { scanCooldownRef.current = false }, 1500)
              }
            } catch {}
          }
          rafId = requestAnimationFrame(loop)
        }
        rafId = requestAnimationFrame(loop)
      } catch (err) {
        if (!cancelled) {
          console.error('Scanner error:', err)
          setScanMode(false)
        }
      }
    }

    initAndLoop()

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      codeReaderRef.current?.reset?.()
      codeReaderRef.current = null
    }
  }, [scanMode, handleScanResult])

  const stopCamera = () => {
    codeReaderRef.current?.reset?.()
    codeReaderRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setScanMode(false)
    setScanResult(null)
  }

  const beep = useCallback((type = 'found') => {
    try {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audioCtxRef.current
      const play = (freq, dur, t = 'sine', d = 0) => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = t; o.frequency.value = freq
        g.gain.setValueAtTime(0.4, ctx.currentTime + d)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + dur)
        o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + dur)
      }
      if (type === 'found') { play(1200,0.12); play(1500,0.12,'sine',0.15) }
      else if (type === 'duplicate') { play(700,0.35,'square') }
      else { play(300,0.5,'sawtooth') }
    } catch {}
  }, [])

  const handleScanResult = useCallback((code) => {
    const codeLower = code.toLowerCase()

    // เช็คซ้ำก่อน
    if (scannedSerialsRef.current.has(codeLower)) {
      const item = items.find(i =>
        Array.isArray(i.serials) && i.serials.some(s => s.toLowerCase() === codeLower)
      )
      beep('duplicate')
      setScanResult({ serial: code, item, status: 'duplicate' })
      setTimeout(() => { setScanResult(null) }, 1500)
      return
    }

    // match by serial
    const found = items.find(i =>
      Array.isArray(i.serials) && i.serials.some(s => s.toLowerCase() === codeLower)
    )

    if (found) {
      // เพิ่ม serial เข้า scanned set
      const newSet = new Set(scannedSerialsRef.current)
      newSet.add(codeLower)
      scannedSerialsRef.current = newSet
      setScannedSerials(new Set(newSet))
      
      // บันทึกไป API
      if (sessionKeyRef.current) {
        fetch(`/api/scan-session/${sessionKeyRef.current}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serial: codeLower })
        }).catch(err => console.error('Failed to sync:', err))
      }

      beep('found')
      setScanResult({ serial: code, item: found, status: 'found' })
      setScanFlash(true)
      setTimeout(() => setScanFlash(false), 600)
      setTimeout(() => {
        document.getElementById(`serial-${codeLower}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
    } else {
      beep('notfound')
      setScanResult({ serial: code, item: null, status: 'notfound' })
    }

    setTimeout(() => {
      setScanResult(null)
    }, 1500)
  }, [items, beep])

  // สร้าง flat list ของ serials ในหมวดที่เลือก
  // แต่ละ row = { serial, item, scanned }
  const listItems = items.filter(
    (i) => i.category === selectedCat && i.subcategory === selectedSub
  );

  // flat list serials
  const serialRows = listItems.flatMap(item =>
    (item.serials || []).map(serial => ({
      serial,
      serialLower: serial.toLowerCase(),
      item,
      scanned: scannedSerials.has(serial.toLowerCase()),
    }))
  );

  const filtered = searchQ.trim()
    ? serialRows.filter(row =>
        row.serial.toLowerCase().includes(searchQ.toLowerCase()) ||
        row.item.name.toLowerCase().includes(searchQ.toLowerCase())
      )
    : serialRows;

  const subCatsWithItems = selectedCat
    ? categories[selectedCat].subcategories.filter((sub) =>
        items.some((i) => i.category === selectedCat && i.subcategory === sub),
      )
    : [];

  const handleSelectCat = (catKey) => {
    setSelectedCat(catKey);
    setSelectedSub(null);
    setSavedCount(0);
    // อย่า reset scannedSerials ตรงนี้ เพราะต่อไปจะ load จาก localStorage ใน handleSelectSub
    setStep("subcategory");
  };

  const handleSelectSub = (sub) => {
    setSelectedSub(sub);
    setSearchQ("");
    setStep("count");
    
    // สร้าง session key — มีวันที่เพื่อให้นับใหม่ได้ทุกวัน
    const today = new Date().toISOString().slice(0,10)
    const key = `scan_${selectedCat}_${sub}_${today}`.replace(/[/\s]/g,'_')
    sessionKeyRef.current = key;
    
    // โหลดข้อมูลจาก API
    fetch(`/api/scan-session/${key}`)
      .then(res => res.json())
      .then(data => {
        const set = new Set(data.serials || []);
        setScannedSerials(set);
        scannedSerialsRef.current = set;
      })
      .catch(err => {
        console.error('Failed to load session:', err);
        setScannedSerials(new Set());
        scannedSerialsRef.current = new Set();
      });
  };

  // ประมวลผล manual input — comma/newline separated
  const handleAddManual = (text) => {
    setManualInput('');
    const codes = text.split(/[,\n]/).map(s => s.trim()).filter(s => s);
    for (const code of codes) {
      handleScanResult(code);
    }
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

  const totalSerials = serialRows.length;
  const scannedCount = scannedSerials.size;

  const handleSave = async () => {
    setSaving(true);
    let saved = 0;
    // group scanned serials by item
    const countByItem = {};
    for (const s of scannedSerials) {
      const item = items.find(i =>
        Array.isArray(i.serials) && i.serials.some(sr => sr.toLowerCase() === s)
      );
      if (item) {
        countByItem[item.id] = (countByItem[item.id] || 0) + 1;
      }
    }
    for (const item of listItems) {
      const newQty = countByItem[item.id] ?? 0;
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
    setSavedCount(saved);
    setSaving(false);
    setNote("");
    
    // ลบ session จาก API หลังบันทึกเสร็จ
    if (sessionKeyRef.current) {
      fetch(`/api/scan-session/${sessionKeyRef.current}`, { method: 'DELETE' })
        .catch(err => console.error('Failed to clear session:', err))
    }
    
    // reset
    scannedSerialsRef.current = new Set();
    setScannedSerials(new Set());
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
              {/* ปุ่มสแกน barcode */}
              <button
                onClick={() => scanMode ? stopCamera() : startCamera()}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
                  scanMode
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                }`}
              >
                {scanMode ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                <span className="hidden sm:inline">{scanMode ? 'ปิดกล้อง' : 'กล้อง'}</span>
              </button>
              {/* ปุ่มเครื่องยิง barcode — แสดง indicator ว่า active */}
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border shrink-0 ${
                gunMode
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600 cursor-pointer hover:bg-slate-700'
              }`}
                onClick={() => setGunMode(prev => !prev)}
                title="เครื่องยิง barcode"
              >
                <Scan className="w-4 h-4" />
                <span className="hidden sm:inline">{gunMode ? 'ยิงอยู่' : 'เครื่องยิง'}</span>
                {gunMode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </div>              <span className="text-slate-500 text-sm shrink-0">
                {filtered.length} รายการ
              </span>
            </div>

            {/* Manual Serial Input */}
            <div className="mb-3 bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-2">พิมพ์ Serial (คั่นด้วย , หรือ Enter)</p>
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    handleAddManual(manualInput);
                  }
                }}
                placeholder="VT0001, VT0002, VT0003..."
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-16 font-mono"
              />
              <button
                onClick={() => handleAddManual(manualInput)}
                className="mt-2 w-full px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-all"
              >
                เพิ่มทั้งหมด (Ctrl+Enter)
              </button>
            </div>

            {/* Camera preview */}
            {scanMode && (
              <div className="relative mb-3 rounded-2xl overflow-hidden bg-black border border-slate-700">
                <video ref={videoRef} className="w-full max-h-48 object-cover" playsInline muted />
                {/* viewfinder */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-24 border-2 border-blue-400 rounded-lg opacity-70">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400 rounded-br" />
                  </div>
                </div>
                {/* scan result flash */}
                {scanResult && (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    scanResult.status === 'found' ? 'bg-emerald-500/30' :
                    scanResult.status === 'duplicate' ? 'bg-amber-500/30' :
                    'bg-red-500/30'
                  }`}>
                    <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                      scanResult.status === 'found' ? 'bg-emerald-500 text-white' :
                      scanResult.status === 'duplicate' ? 'bg-amber-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {scanResult.status === 'found'
                        ? `✓ ${scanResult.item.name}`
                        : scanResult.status === 'duplicate'
                        ? `⚠ สแกนซ้ำ: ${scanResult.serial}`
                        : `ไม่พบ: ${scanResult.serial}`}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-slate-400">
                  <Zap className="w-3 h-3 inline mr-1 text-blue-400" />
                  หันกล้องไปที่ barcode
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filtered.length === 0 && (
                <div className="flex items-center justify-center h-40 text-slate-500">
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
                        ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/50"
                        : "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50"
                      : row.scanned
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-slate-800/60 border-slate-700/60"
                  }`}
                >
                  <span className="text-slate-600 text-xs w-5 shrink-0 text-right">{idx + 1}</span>

                  {/* checkmark */}
                  <div className="shrink-0">
                    {row.scanned
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <div className="w-4 h-4 rounded-full border border-slate-600" />
                    }
                  </div>

                  {/* serial + ชื่อสินค้า */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-300 leading-tight">{row.serial}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{row.item.name}</p>
                  </div>

                  {/* สถานะ */}
                  {row.scanned && (
                    <span className="text-xs text-emerald-400 font-medium shrink-0">นับแล้ว</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Panel สรุป */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                <span className="text-slate-400">
                  หมวด:{" "}
                  <span className="text-blue-300 font-medium">{selectedSub}</span>
                </span>
                <div className="flex gap-3">
                  <span className="text-slate-400">
                    สแกนแล้ว:{" "}
                    <span className="font-bold text-emerald-400">{scannedCount}</span>
                  </span>
                  <span className="text-slate-400">
                    ทั้งหมด:{" "}
                    <span className="font-bold text-white">{totalSerials}</span>
                  </span>
                  <span className="text-slate-400">
                    เหลือ:{" "}
                    <span className={`font-bold ${totalSerials - scannedCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      {totalSerials - scannedCount}
                    </span>
                  </span>
                </div>
              </div>

              {/* progress bar */}
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: totalSerials > 0 ? `${(scannedCount / totalSerials) * 100}%` : '0%' }}
                />
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
                  บันทึก {scannedCount} ชิ้น
                </button>
              </div>

              <button
                onClick={() => {
                  // ลบจาก API + state
                  if (sessionKeyRef.current) {
                    fetch(`/api/scan-session/${sessionKeyRef.current}`, { method: 'DELETE' })
                      .catch(err => console.error('Failed to clear:', err))
                  }
                  setScannedSerials(new Set());
                  scannedSerialsRef.current = new Set();
                }}
                className="flex items-center justify-center gap-1 text-slate-500 hover:text-white text-xs transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> รีเซ็ต
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
