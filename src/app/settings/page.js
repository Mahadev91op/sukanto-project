"use client";
import { useState, useEffect } from "react";
import { 
  Settings, 
  Printer, 
  Check, 
  Loader2, 
  RotateCcw, 
  AlertTriangle, 
  Database, 
  Trash2, 
  FileDown, 
  FileUp,
  CloudDownload,
  RefreshCw,
  ShieldCheck,
  GitBranch,
  ArrowUpCircle,
  Sparkles,
  Clock,
  Globe,
  CheckCircle2,
  HelpCircle,
  ShieldAlert
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Barcode from "react-barcode";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Printer config states
  const [settings, setSettings] = useState({
    layoutType: "1-UP",
    barcodeFormat: "CODE128",
    width: 50,
    height: 25,
    fontSize: 8,
    gap: 2,
    showBillNumber: true,
    showPurchaseDate: true,
    useGuidelines: false,
    quietZone: 15,
    lineThickness: 1.2,
    barcodeHeight: 15
  });

  // Database tools and tabs states
  const [activeTab, setActiveTab] = useState("barcode");
  const [thresholdMonths, setThresholdMonths] = useState(6);
  const [pruneMeds, setPruneMeds] = useState(true);
  const [pruneSales, setPruneSales] = useState(true);
  const [pruning, setPruning] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState(null);

  // Remote Update States
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updatingSystem, setUpdatingSystem] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [lastCheckedTime, setLastCheckedTime] = useState(null);


  const handlePrune = async (e) => {
    e.preventDefault();
    if (!pruneMeds && !pruneSales) {
      toast.error("Please select at least one data type to delete.");
      return;
    }

    const durationText = thresholdMonths < 12 
      ? `${thresholdMonths} Months` 
      : `${thresholdMonths / 12} Year(s)`;

    const isConfirm = window.confirm(
      `⚠️ DATABASE SELECTIVE CLEANUP ⚠️\n\n` +
      `Aapne "${durationText}" select kiya hai:\n\n` +
      `✅ SURAKSHIT (SAFE): Pichhle ${durationText} ka saara active data bilkul SAFE rahega.\n` +
      `❌ DELETE: Sirf ${durationText} se PURANA (older) data permanently delete hoga:\n` +
      `${pruneMeds ? "  • Purana Zero-Stock / Expired medicine data\n" : ""}` +
      `${pruneSales ? "  • Purani sales transaction history\n" : ""}\n` +
      `Kya aap ye cleanup continue karna chahte hain?`
    );

    if (!isConfirm) return;

    setPruning(true);
    const toastId = toast.loading(`⏳ Cleaning up records older than ${durationText}...`);
    try {
      const res = await fetch("/api/settings/prune", {
        method: "POST",
        body: JSON.stringify({
          thresholdMonths,
          pruneMedicines: pruneMeds,
          pruneSales
        }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { id: toastId, duration: 6000 });
      } else {
        toast.error("Cleanup failed: " + data.error, { id: toastId });
      }
    } catch (err) {
      toast.error("Network error during cleanup.", { id: toastId });
    } finally {
      setPruning(false);
    }
  };

  const handleBackup = async () => {
    const toastId = toast.loading("⏳ Preparing offline database backup...");
    try {
      const res = await fetch("/api/backup");
      const data = await res.json();
      if (data.success) {
        const jsonString = JSON.stringify(data.backup, null, 2);

        const now = new Date();
        const dateStr = now.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '_');
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const filename = `MedicalERP_Backup_${dateStr}_${timeStr}.json`;

        // 1. Native Folder & File Picker (Windows Save As Dialog - 100% Offline)
        if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
          try {
            const fileHandle = await window.showSaveFilePicker({
              suggestedName: filename,
              types: [
                {
                  description: "JSON Database Backup (*.json)",
                  accept: { "application/json": [".json"] }
                }
              ]
            });
            const writable = await fileHandle.createWritable();
            await writable.write(jsonString);
            await writable.close();

            toast.success("✅ Backup saved to your selected location successfully!", { id: toastId, duration: 5000 });
            return;
          } catch (pickerErr) {
            // User cancelled the file picker dialog
            if (pickerErr.name === "AbortError") {
              toast.dismiss(toastId);
              return;
            }
            console.warn("Save picker unavailable, falling back to standard download:", pickerErr);
          }
        }

        // 2. Standard 100% Offline Fallback
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", url);
        downloadAnchor.setAttribute("download", filename);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        URL.revokeObjectURL(url);

        toast.success("✅ Backup file saved to your device!", { id: toastId, duration: 5000 });
      } else {
        toast.error("Backup failed: " + data.error, { id: toastId });
      }
    } catch (err) {
      toast.error("Offline backup error: " + err.message, { id: toastId });
    }
  };

  const handleRestore = async (e) => {
    e.preventDefault();
    if (!selectedBackupFile) {
      toast.error("Please select a JSON backup file first.");
      return;
    }

    const isConfirm = window.confirm(
      `⚠️ DANGER: COMPLETE RESTORE WARNING ⚠️\n\n` +
      `This will completely OVERWRITE your current database collections!\n` +
      `All existing medicines, sales, and settings will be permanently replaced by the data in "${selectedBackupFile.name}".\n\n` +
      `Make sure you have saved a backup of your current database first!\n` +
      `Do you want to proceed with the restore?`
    );

    if (!isConfirm) return;

    setRestoring(true);
    const toastId = toast.loading("⏳ Overwriting database with backup file...");

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target.result);
          const res = await fetch("/api/restore", {
            method: "POST",
            body: JSON.stringify({ backup: backupData }),
            headers: { "Content-Type": "application/json" }
          });
          const data = await res.json();
          if (data.success) {
            toast.success(data.message, { id: toastId, duration: 6000 });
            alert("✅ RESTORE COMPLETED!\n\nSystem data recovered 100% successfully. Page will reload now.");
            window.location.reload();
          } else {
            toast.error("Restore failed: " + data.error, { id: toastId });
          }
        } catch (parseError) {
          toast.error("Invalid file content. Must be a valid JSON backup file.", { id: toastId });
          setRestoring(false);
        }
      };
      fileReader.readAsText(selectedBackupFile);
    } catch (err) {
      toast.error("Failed to read file.", { id: toastId });
      setRestoring(false);
    }
  };

  const handleCheckUpdate = async (silent = false) => {
    setCheckingUpdate(true);
    const toastId = !silent ? toast.loading("🔍 Checking for updates on GitHub...") : null;
    try {
      const res = await fetch("/api/settings/update");
      const data = await res.json();
      if (data.success) {
        setUpdateInfo(data);
        setLastCheckedTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        if (!silent) {
          if (!data.isOnline) {
            toast.error(data.errorNotice || "Offline / GitHub se connect nahi ho pa raha hai.", { id: toastId });
          } else if (data.isUpToDate) {
            toast.success("✅ Aapka software already latest version par hai!", { id: toastId, duration: 4000 });
          } else {
            toast.success(`🎉 Naya Update Available Hai! (${data.commitsBehind} naye changes)`, { id: toastId, duration: 5000 });
          }
        }
      } else {
        if (!silent) toast.error("Failed to check updates: " + (data.error || "Unknown error"), { id: toastId });
      }
    } catch (err) {
      if (!silent) toast.error("Network error while checking updates.", { id: toastId });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleApplyUpdate = async () => {
    const isConfirm = window.confirm(
      "🚀 SYSTEM UPDATE CONFIRMATION 🚀\n\n" +
      "✅ 100% DATABASE SAFE: Aapka database (medicines stock, bills, sales records) bilkul safe rahega.\n" +
      "📦 Sirf naya program code GitHub se download hokar update hoga.\n\n" +
      "Kya aap abhi software update karna chahte hain?"
    );
    if (!isConfirm) return;

    setUpdatingSystem(true);
    const toastId = toast.loading("⏳ Downloading & applying update from GitHub... Please wait...");
    try {
      const res = await fetch("/api/settings/update", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "✅ System updated successfully!", { id: toastId, duration: 8000 });
        await handleCheckUpdate(true);
        alert(
          "🎉 UPDATE COMPLETE!\n\n" +
          "Software successfully update ho chuka hai.\n" +
          "Naye features activate karne ke liye page reload ho raha hai."
        );
        window.location.reload();
      } else {
        toast.error("Update failed: " + data.error, { id: toastId, duration: 6000 });
      }
    } catch (err) {
      toast.error("Update error: " + err.message, { id: toastId });
    } finally {
      setUpdatingSystem(false);
    }
  };

  useEffect(() => {
    if (activeTab === "update" && !updateInfo && !checkingUpdate) {
      handleCheckUpdate(true);
    }
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        localStorage.setItem("printer_settings", JSON.stringify(data.settings));
      } else {
        // Fallback to local storage if API failed
        const local = localStorage.getItem("printer_settings");
        if (local) {
          setSettings(JSON.parse(local));
        }
      }
    } catch (err) {
      const local = localStorage.getItem("printer_settings");
      if (local) {
        setSettings(JSON.parse(local));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);


  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Save to Database
      const res = await fetch("/api/settings", {
        method: "POST",
        body: JSON.stringify(settings),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        // 2. Cache in localStorage for instant offline access
        localStorage.setItem("printer_settings", JSON.stringify(settings));
        toast.success("Settings saved successfully to database!");
      } else {
        toast.error("Failed to save to database. Saving locally instead.");
        localStorage.setItem("printer_settings", JSON.stringify(settings));
      }
    } catch (err) {
      toast.error("Network error. Saved locally to browser cache.");
      localStorage.setItem("printer_settings", JSON.stringify(settings));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset to default thermal printer configuration (50x25mm)?")) {
      const defaults = {
        layoutType: "1-UP",
        barcodeFormat: "CODE128",
        width: 50,
        height: 25,
        fontSize: 8,
        gap: 2,
        showBillNumber: true,
        showPurchaseDate: true,
        useGuidelines: false,
        quietZone: 15,
        lineThickness: 1.2,
        barcodeHeight: 15
      };
      setSettings(defaults);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="font-semibold text-xs md:text-sm">Loading printing profiles...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex items-center">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center mr-3 md:mr-4 border border-emerald-100 shrink-0">
          {activeTab === "barcode" && <Printer className="w-5 h-5 md:w-6 md:h-6" />}
          {activeTab === "data" && <Database className="w-5 h-5 md:w-6 md:h-6" />}
          {activeTab === "update" && <CloudDownload className="w-5 h-5 md:w-6 md:h-6" />}
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">
            {activeTab === "barcode" && "Printing Profiles & Barcode Settings"}
            {activeTab === "data" && "Database Maintenance & Backup Tools"}
            {activeTab === "update" && "Remote Cloud Software Update"}
          </h1>
          <p className="text-slate-500 text-[10px] md:text-sm font-medium mt-0.5">
            {activeTab === "barcode" && "Customize layouts (1-UP/2-UP), paper sizes, and calibration options with a live preview."}
            {activeTab === "data" && "Safely export offline JSON backups, restore database, or prune old expired records."}
            {activeTab === "update" && "Ghar baithe 1-click me naya code update karein. Database aur records 100% surakshit rahenge."}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 md:gap-6 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("barcode")}
          className={`pb-3 text-xs md:text-sm font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === "barcode"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Printer className="w-4 h-4" />
          Barcode & Printing
        </button>
        <button
          onClick={() => setActiveTab("data")}
          className={`pb-3 text-xs md:text-sm font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === "data"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Database className="w-4 h-4" />
          Data & Database Tools
        </button>
        <button
          onClick={() => setActiveTab("update")}
          className={`pb-3 text-xs md:text-sm font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-1.5 relative ${
            activeTab === "update"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <CloudDownload className="w-4 h-4" />
          Software Remote Update
          {updateInfo && !updateInfo.isUpToDate && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block ml-1"></span>
          )}
        </button>
      </div>

      {activeTab === "barcode" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">

        
        {/* Left Side: Form Controls */}
        <form onSubmit={handleSave} className="lg:col-span-5 bg-white p-6 rounded-[24px] border border-slate-200 shadow-[0_4px_20px_-3px_rgba(0,0,0,0.05)] space-y-5 h-fit">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-emerald-500" /> Print Configuration
          </h2>

          <div className="space-y-4">
            
            {/* Layout Type Selection */}
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Label Row Layout</label>
              <select
                value={settings.layoutType}
                onChange={(e) => setSettings({...settings, layoutType: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm font-semibold cursor-pointer"
              >
                <option value="1-UP">1-UP (Single sticker per row)</option>
                <option value="2-UP">2-UP (Double side-by-side sticker)</option>
              </select>
            </div>

            {/* Barcode Format Selection */}
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Barcode Symbology Format</label>
              <select
                value={settings.barcodeFormat}
                onChange={(e) => setSettings({...settings, barcodeFormat: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm font-semibold cursor-pointer"
              >
                <option value="CODE128">CODE128 (Standard alphanumeric support)</option>
                <option value="EAN8">EAN8 (Numerical - optimized for high-speed scanning)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                * Pro-Tip: EAN8 format renders thicker lines that scan faster on small stickers.
              </p>
            </div>

            {/* Dimension Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Width per Label (mm)</label>
                <input 
                  type="number"
                  min="25"
                  max="120"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-xs font-bold text-center"
                  value={settings.width}
                  onChange={(e) => setSettings({...settings, width: Math.max(25, Number(e.target.value))})}
                />
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Height per Label (mm)</label>
                <input 
                  type="number"
                  min="15"
                  max="80"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-xs font-bold text-center"
                  value={settings.height}
                  onChange={(e) => setSettings({...settings, height: Math.max(15, Number(e.target.value))})}
                />
              </div>
            </div>

            {/* Gap and Font size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Label Gap (mm)</label>
                <input 
                  type="number"
                  min="0"
                  max="20"
                  disabled={settings.layoutType === "1-UP"}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-xs font-bold text-center disabled:opacity-50"
                  value={settings.gap}
                  onChange={(e) => setSettings({...settings, gap: Math.max(0, Number(e.target.value))})}
                />
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Font Size (px)</label>
                <input 
                  type="number"
                  min="6"
                  max="16"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-xs font-bold text-center"
                  value={settings.fontSize}
                  onChange={(e) => setSettings({...settings, fontSize: Math.max(6, Number(e.target.value))})}
                />
              </div>
            </div>

            {/* Advanced Scanner Alignment Sliders */}
            <div className="pt-3 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <Settings className="w-3.5 h-3.5 text-emerald-500" /> Scanner Calibration
              </h3>

              <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <span>Quiet Zone (Side Margins)</span>
                    <span className="text-emerald-600 font-extrabold text-xs">{settings.quietZone ?? 15}px</span>
                  </div>
                  <input 
                    type="range"
                    min="4"
                    max="35"
                    step="1"
                    className="w-full accent-emerald-500 cursor-pointer h-5"
                    value={settings.quietZone ?? 15}
                    onChange={(e) => setSettings({...settings, quietZone: Number(e.target.value)})}
                  />
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Increases white gap on left/right for quick scanning.</p>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <span>Line Thickness (Scale)</span>
                    <span className="text-emerald-600 font-extrabold text-xs">{settings.lineThickness ?? 1.2}x</span>
                  </div>
                  <input 
                    type="range"
                    min="0.7"
                    max="2.2"
                    step="0.1"
                    className="w-full accent-emerald-500 cursor-pointer h-5"
                    value={settings.lineThickness ?? 1.2}
                    onChange={(e) => setSettings({...settings, lineThickness: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <span>Barcode Line Height</span>
                    <span className="text-emerald-600 font-extrabold text-xs">{settings.barcodeHeight ?? 15}mm</span>
                  </div>
                  <input 
                    type="range"
                    min="8"
                    max="30"
                    step="1"
                    className="w-full accent-emerald-500 cursor-pointer h-5"
                    value={settings.barcodeHeight ?? 15}
                    onChange={(e) => setSettings({...settings, barcodeHeight: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* Checklist toggles */}
            <div className="pt-2 space-y-2 border-t border-slate-100">
              <label className="flex items-center gap-2.5 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={settings.showBillNumber}
                  onChange={(e) => setSettings({...settings, showBillNumber: e.target.checked})}
                  className="rounded border-slate-350 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
                <span>Include Bill / Invoice Number</span>
              </label>

              <label className="flex items-center gap-2.5 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={settings.showPurchaseDate}
                  onChange={(e) => setSettings({...settings, showPurchaseDate: e.target.checked})}
                  className="rounded border-slate-350 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
                <span>Include Purchase Date (PUR)</span>
              </label>

              <label className="flex items-center gap-2.5 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-xs font-bold text-rose-600">
                <input
                  type="checkbox"
                  checked={settings.useGuidelines}
                  onChange={(e) => setSettings({...settings, useGuidelines: e.target.checked})}
                  className="rounded border-slate-350 text-rose-500 focus:ring-rose-400 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
                <span>Show Calibration Outline Borders (Print Debugging)</span>
              </label>
            </div>

          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1 text-xs disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save Profile</span>
              )}
            </button>
          </div>
        </form>

        {/* Right Side: Live preview */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Live Visual Print Preview</h2>
          
          <div className="bg-slate-800 p-8 rounded-[24px] border border-slate-700 min-h-[420px] flex flex-col items-center justify-center relative shadow-lg overflow-hidden">
            
            {/* Calibration Alert message if borders are enabled */}
            {settings.useGuidelines && (
              <div className="absolute top-4 left-4 right-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] md:text-xs font-semibold p-2.5 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Printer Calibration Guidelines are enabled. Label borders will appear on print.</span>
              </div>
            )}

            {/* Label grid structure */}
            <div className="flex flex-row items-center border border-dashed border-slate-600 p-6 rounded-2xl bg-slate-900/40 relative max-w-full overflow-x-auto gap-4">
              
              {/* Sticker 1 */}
              <div 
                className={`bg-white text-black flex flex-col items-center justify-center p-3 overflow-hidden shadow-2xl transition-all duration-300 ${
                  settings.useGuidelines ? 'border border-rose-500' : 'border border-transparent'
                }`}
                style={{ 
                  width: `${settings.width * 3.5}px`, 
                  height: `${settings.height * 3.5}px`,
                  minWidth: `${settings.width * 3.5}px`, 
                  minHeight: `${settings.height * 3.5}px`
                }}
              >
                <div className="w-full flex items-center justify-center scale-90 md:scale-100 origin-center">
                    <Barcode
                      value={settings.barcodeFormat === "EAN8" ? "12345670" : "MED-9908"}
                      format={settings.barcodeFormat}
                      width={settings.lineThickness ?? 1.2}
                      height={(settings.barcodeHeight ?? 15) * 2}
                      fontSize={settings.fontSize + 1}
                      margin={2}
                      marginLeft={settings.quietZone ?? 15}
                      marginRight={settings.quietZone ?? 15}
                      background="#ffffff"
                      lineColor="#000000"
                      displayValue={true}
                    />
                </div>
                
                {(settings.showBillNumber || settings.showPurchaseDate) && (
                  <div className="w-full text-center mt-1 select-none leading-none" style={{ fontSize: `${settings.fontSize}px` }}>
                    <p className="font-extrabold text-black uppercase tracking-tight truncate leading-tight select-none">
                      {settings.showBillNumber && "BILL: GST-1092"} {settings.showBillNumber && settings.showPurchaseDate && "|"} {settings.showPurchaseDate && "PUR: 13/08/26"}
                    </p>
                  </div>
                )}
              </div>

              {/* Spacer Gap Representation */}
              {settings.layoutType === "2-UP" && (
                <div 
                  className="bg-slate-700/50 border border-slate-600 border-dashed rounded flex flex-col justify-center items-center text-[9px] font-bold text-slate-500 transition-all duration-300"
                  style={{ width: `${settings.gap * 3.5}px`, height: '80px', minWidth: `${settings.gap * 3.5}px` }}
                >
                  <span className="scale-75 origin-center">{settings.gap}mm</span>
                </div>
              )}

              {/* Sticker 2 (If 2-UP) */}
              {settings.layoutType === "2-UP" && (
                <div 
                  className={`bg-white text-black flex flex-col items-center justify-center p-3 overflow-hidden shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95 ${
                    settings.useGuidelines ? 'border border-rose-500' : 'border border-transparent'
                  }`}
                  style={{ 
                    width: `${settings.width * 3.5}px`, 
                    height: `${settings.height * 3.5}px`,
                    minWidth: `${settings.width * 3.5}px`, 
                    minHeight: `${settings.height * 3.5}px`
                  }}
                >
                  <div className="w-full flex items-center justify-center scale-90 md:scale-100 origin-center">
                    <Barcode
                      value={settings.barcodeFormat === "EAN8" ? "12345670" : "MED-9908"}
                      format={settings.barcodeFormat}
                      width={settings.lineThickness ?? 1.2}
                      height={(settings.barcodeHeight ?? 15) * 2}
                      fontSize={settings.fontSize + 1}
                      margin={2}
                      marginLeft={settings.quietZone ?? 15}
                      marginRight={settings.quietZone ?? 15}
                      background="#ffffff"
                      lineColor="#000000"
                      displayValue={true}
                    />
                  </div>
                  
                  {(settings.showBillNumber || settings.showPurchaseDate) && (
                    <div className="w-full text-center mt-1 select-none leading-none" style={{ fontSize: `${settings.fontSize}px` }}>
                      <p className="font-extrabold text-black uppercase tracking-tight truncate leading-tight select-none">
                        {settings.showBillNumber && "BILL: GST-1092"} {settings.showBillNumber && settings.showPurchaseDate && "|"} {settings.showPurchaseDate && "PUR: 13/08/26"}
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Details label overlay */}
            <div className="text-[10px] md:text-xs text-slate-500 font-bold text-center mt-6 space-y-1">
              <p>Display Size scale: 1mm = 3.5px (Approximate alignment guide)</p>
              <p>Format: {settings.barcodeFormat} | Mode: {settings.layoutType} ({settings.width}x{settings.height}mm)</p>
            </div>
            
          </div>
        </div>
      </div>
      )}

      {/* 2. Data & Database Tools Tab */}
      {activeTab === "data" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 animate-in fade-in duration-300">
          
          {/* Left Side: Pruning/Cleanup */}
          <div className="bg-white p-6 md:p-8 rounded-[24px] border border-slate-200 shadow-[0_4px_20px_-3px_rgba(0,0,0,0.05)] space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-805 flex items-center gap-2 mb-1">
                <Trash2 className="w-5 h-5 text-rose-500" /> Database Selective Pruning
              </h2>
              <p className="text-xs text-slate-500 font-medium">Permanently delete old, useless, and redundant records to keep database clean and optimized.</p>
            </div>

            <form onSubmit={handlePrune} className="space-y-5">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Retention Period (Data to Keep Safe)</label>
                <select
                  value={thresholdMonths}
                  onChange={(e) => setThresholdMonths(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all text-sm font-semibold cursor-pointer"
                >
                  <option value={1}>1 Month (Keep last 30 days)</option>
                  <option value={3}>3 Months (Keep last 90 days)</option>
                  <option value={6}>6 Months (Keep last 180 days)</option>
                  <option value={12}>1 Year (Keep last 12 months)</option>
                  <option value={24}>2 Years (Keep last 24 months)</option>
                </select>
              </div>

              {/* Visual Safe vs Delete info box */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex items-center text-emerald-800 font-bold gap-1.5">
                  <span>✅ Surakshit (Safe):</span>
                  <span className="font-semibold text-emerald-700">
                    Abhi se lekar pichhle {thresholdMonths < 12 ? `${thresholdMonths} Mahine` : `${thresholdMonths / 12} Saal`} ka saara data rahega.
                  </span>
                </div>
                <div className="flex items-center text-rose-700 font-bold gap-1.5">
                  <span>❌ Delete Hoga:</span>
                  <span className="font-semibold text-rose-600">
                    {thresholdMonths < 12 ? `${thresholdMonths} Mahine` : `${thresholdMonths / 12} Saal`} se purana data permanently delete hoga.
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-start gap-3 p-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pruneMeds}
                    onChange={(e) => setPruneMeds(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-rose-500 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700">Out of Stock & Expired Medicines</span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Sirf wahi medicines delete hongi jinka stock 0 hai AUR jo {thresholdMonths < 12 ? `${thresholdMonths} Mahine` : `${thresholdMonths / 12} Saal`} se purani hain. Active stock hamesha safe rahega.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-1 cursor-pointer select-none border-t border-slate-200/60 pt-3">
                  <input
                    type="checkbox"
                    checked={pruneSales}
                    onChange={(e) => setPruneSales(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-rose-500 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700">Sales Transactions History</span>
                    <p className="text-[10px] text-slate-450 font-semibold mt-0.5">
                      Pichhle {thresholdMonths < 12 ? `${thresholdMonths} mahine` : `${thresholdMonths / 12} saal`} ki sales safe rahengi, usse purane sales logs delete honge.
                    </p>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={pruning}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 md:py-3.5 rounded-xl font-bold text-xs md:text-sm shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50"
              >
                {pruning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Clean Selected Data
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Side: Backup & Restore */}
          <div className="bg-white p-6 md:p-8 rounded-[24px] border border-slate-200 shadow-[0_4px_20px_-3px_rgba(0,0,0,0.05)] space-y-6 flex flex-col justify-between">
            
            {/* Backup Block */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-600" /> Database Offline Backup
                  </h2>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    100% Offline
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Export complete database records (distributors, medicines, sales, printer settings). You can choose any folder on your computer (D: Drive, USB, Desktop) to save the file.
                </p>
              </div>

              <button
                onClick={handleBackup}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 md:py-3.5 rounded-xl font-bold text-xs md:text-sm shadow-lg shadow-slate-800/10 transition-all flex items-center justify-center gap-1.5 focus:outline-none"
              >
                <FileDown className="w-4 h-4 text-emerald-400" /> Choose Location & Save Backup
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 my-4"></div>

            {/* Restore Block */}
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-808 flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Database 100% Recovery / Restore
                </h2>
                <p className="text-xs text-slate-505 font-medium">Upload a previously saved `.json` backup file to restore the entire database. WARNING: This replaces current data 100%.</p>
              </div>

              <form onSubmit={handleRestore} className="space-y-3">
                <input
                  type="file"
                  accept=".json"
                  className="w-full text-xs font-semibold text-slate-550 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                  onChange={(e) => setSelectedBackupFile(e.target.files[0] || null)}
                />
                
                <button
                  type="submit"
                  disabled={restoring || !selectedBackupFile}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 md:py-3.5 rounded-xl font-bold text-xs md:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {restoring ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FileUp className="w-4 h-4" /> Upload & Restore Data
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
          
        </div>
      )}

      {/* 3. Software Remote Update Tab */}
      {activeTab === "update" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Safety Guarantee Banner */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-[24px] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-800">100% Database & Stock Safe Guarantee</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Zero Data Loss
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Software update sirf GitHub se naya application code (UI screens, speed enhancements, naye features) download karta hai.
                Aapke <strong>MongoDB Database, Dawaiyon ka Stock, Distributor Records, aur Pichhle Sales Bills</strong> ko KABHI bhi delete ya modify nahi kiya jata.
              </p>
            </div>
          </div>

          {/* Update Action & Status Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Side: System & Branch Information */}
            <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[24px] border border-slate-200 shadow-[0_4px_20px_-3px_rgba(0,0,0,0.05)] space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-500" /> System Version & Repository
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Cloud Repository</span>
                    <span className="font-bold text-slate-700 font-mono text-[11px] truncate max-w-[200px]">Mahadev91op/sukanto-project</span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Active Branch</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      main
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Installed Commit Hash</span>
                    <span className="font-extrabold text-slate-800 font-mono bg-slate-200/70 px-2 py-0.5 rounded">
                      {updateInfo?.currentVersion?.hash || "571ad11"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Installed Date</span>
                    <span className="font-bold text-slate-600">
                      {updateInfo?.currentVersion?.date || "—"}
                    </span>
                  </div>
                </div>

                {updateInfo?.currentVersion?.message && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Installed Update</span>
                    <p className="font-semibold text-slate-700 text-xs italic">
                      &quot;{updateInfo.currentVersion.message}&quot;
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => handleCheckUpdate(false)}
                    disabled={checkingUpdate || updatingSystem}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 focus:outline-none disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 text-emerald-600 ${checkingUpdate ? 'animate-spin' : ''}`} />
                    {checkingUpdate ? "Checking GitHub..." : "Check for Updates Now"}
                  </button>
                  {lastCheckedTime && (
                    <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
                      Last checked at: {lastCheckedTime}
                    </p>
                  )}
                </div>

              </div>
            </div>

            {/* Right Side: Update Action Panel */}
            <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[24px] border border-slate-200 shadow-[0_4px_20px_-3px_rgba(0,0,0,0.05)] space-y-6 flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <CloudDownload className="w-4 h-4 text-emerald-500" /> Cloud Sync & Update Status
                  </h3>
                  {updateInfo && (
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      !updateInfo.isOnline
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : updateInfo.isUpToDate
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                    }`}>
                      {!updateInfo.isOnline ? 'Offline' : updateInfo.isUpToDate ? 'Up to Date' : 'Update Available'}
                    </span>
                  )}
                </div>

                {checkingUpdate ? (
                  <div className="p-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                    <p className="font-bold text-slate-700 text-sm">GitHub repository scan kiya ja raha hai...</p>
                    <p className="text-xs text-slate-400">Pata lagaya ja raha hai ki koi naya update available hai ya nahi.</p>
                  </div>
                ) : updateInfo && !updateInfo.isOnline ? (
                  <div className="p-6 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      GitHub se connection nahi ho saka
                    </div>
                    <p className="text-xs text-rose-700 font-medium">
                      {updateInfo.errorNotice || "Kripya check karein ki aapka computer internet se connected hai."}
                    </p>
                  </div>
                ) : updateInfo && !updateInfo.isUpToDate ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-amber-900 text-sm flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-600" /> Naya Update Taiyar Hai!
                        </span>
                        <span className="text-xs font-black bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                          {updateInfo.commitsBehind} New Release(s)
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 font-medium">
                        Developer ne GitHub par naye features/updates push kar diye hain. Neeche diye gaye button par click karke aap turant install kar sakte hain.
                      </p>
                    </div>

                    {updateInfo.pendingUpdates && updateInfo.pendingUpdates.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Naye Features / Changes</span>
                        <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                          {updateInfo.pendingUpdates.map((commit, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 text-xs transition-colors">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-mono font-bold text-emerald-700 text-[11px]">#{commit.hash}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">{commit.date}</span>
                              </div>
                              <p className="font-bold text-slate-700">{commit.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3 bg-emerald-50/40 border border-emerald-100 rounded-2xl">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-extrabold text-slate-800 text-sm">Aapka System Latest Version Par Hai!</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                        Aapke ERP me sabhi latest features aur security patches already updated hain. Jab bhi naya update aayega, yahan show ho jayega.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Action Button */}
              <div className="pt-4 border-t border-slate-100">
                {updateInfo && !updateInfo.isUpToDate && updateInfo.isOnline ? (
                  <button
                    onClick={handleApplyUpdate}
                    disabled={updatingSystem}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white py-3.5 md:py-4 rounded-xl font-extrabold text-sm md:text-base shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 focus:outline-none disabled:opacity-50"
                  >
                    {updatingSystem ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Downloading & Updating System...
                      </>
                    ) : (
                      <>
                        <CloudDownload className="w-5 h-5" />
                        Download & Install Update (1-Click)
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleApplyUpdate}
                    disabled={updatingSystem}
                    className="w-full bg-slate-800 hover:bg-slate-900 active:scale-[0.99] text-white py-3 md:py-3.5 rounded-xl font-bold text-xs md:text-sm shadow-lg shadow-slate-800/10 transition-all flex items-center justify-center gap-2 focus:outline-none disabled:opacity-50"
                  >
                    {updatingSystem ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Syncing with Cloud...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 text-emerald-400" />
                        Force Re-sync & Re-pull Latest Code
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* Guide for Client */}
          <div className="bg-white p-6 md:p-7 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-500" />
              Ghar Baithe Remote Update Kaise Kaam Karta Hai?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">1</span>
                <p className="font-bold text-slate-800">Developer Code Push</p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Aap ghar baithe jab bhi apne system se GitHub repository par naye features ya bug fixes push karenge.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">2</span>
                <p className="font-bold text-slate-800">1-Click Update Button</p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Client apne ERP ke Settings me aakar bas &quot;Download &amp; Install Update&quot; button par click karega.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">3</span>
                <p className="font-bold text-slate-800">Zero Downtime &amp; Safe</p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  5-10 seconds me naya version update hokar page reload ho jayega. Database 100% safe rahega.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}


    </div>
  );
}
