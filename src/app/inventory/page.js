"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Package, Search, Printer, Edit, Trash2, 
  Loader2, X, AlertCircle, CheckSquare, Square, RefreshCw
} from "lucide-react";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import toast, { Toaster } from "react-hot-toast";
import { formatDate, formatExpiryDate } from "@/lib/formatDate";

export default function Inventory() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editMed, setEditMed] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [selectedMeds, setSelectedMeds] = useState([]); 
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [printCopies, setPrintCopies] = useState({}); 
  
  const [activePrintMed, setActivePrintMed] = useState(null);
  const [singlePrintQty, setSinglePrintQty] = useState(1);
  
  const printRef = useRef(null);
  const [printQueue, setPrintQueue] = useState([]); 
  
  const [printSettings, setPrintSettings] = useState({
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

  const loadPrintSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setPrintSettings(data.settings);
        localStorage.setItem("printer_settings", JSON.stringify(data.settings));
      } else {
        const local = localStorage.getItem("printer_settings");
        if (local) setPrintSettings(JSON.parse(local));
      }
    } catch (e) {
      const local = localStorage.getItem("printer_settings");
      if (local) setPrintSettings(JSON.parse(local));
    }
  };
  
  const isActionActive = useRef(false);

  useEffect(() => {
    isActionActive.current = showBulkModal || !!editMed;
  }, [showBulkModal, editMed]);

  useEffect(() => {
    loadPrintSettings();
  }, []);

  const fetchMedicines = useCallback(async (isSilent = false, search = "") => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`/api/medicine?limit=100&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setMedicines(data.medicines);
        
        if (!isSilent) {
          const initialCopies = {};
          data.medicines.forEach(m => initialCopies[m._id] = 1);
          setPrintCopies(initialCopies);
        } else {
          setPrintCopies(prev => {
            const newCopies = { ...prev };
            data.medicines.forEach(m => {
              if (newCopies[m._id] === undefined) newCopies[m._id] = 1;
            });
            return newCopies;
          });
        }
      }
    } catch (error) {
      if (!isSilent) toast.error("Failed to load data!");
    }
    if (!isSilent) setLoading(false);
  }, []);

  // DEBOUNCED SERVER-SIDE SEARCH
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchMedicines(false, searchTerm);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchMedicines]);

  // Auto Refresh — every 3 minutes to reduce CPU/network load for local use
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isActionActive.current) {
        fetchMedicines(true, searchTerm);
      }
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [searchTerm, fetchMedicines]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMedicines(true, searchTerm);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handlePrintFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Barcode_Label",
    onAfterPrint: () => {
      console.log("Print process finished, clearing queue.");
      setPrintQueue([]);
      setShowBulkModal(false);
      setSelectedMeds([]);
    },
    onPrintError: (error) => {
      console.error("Print Error:", error);
      toast.error("Error generating print!");
      setPrintQueue([]);
    }
  });

  useEffect(() => {
    if (printQueue.length > 0) {
      const timer = setTimeout(() => {
        handlePrintFn();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printQueue]);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await fetch(`/api/medicine?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Medicine deleted successfully!");
        setSelectedMeds(prev => prev.filter(medId => medId !== id)); 
        fetchMedicines(true, searchTerm);
      }
    } catch (error) {
      toast.error("Error deleting medicine!");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMeds.length === 0) return;
    if (!confirm(`Are you sure you want to delete all ${selectedMeds.length} selected medicines?`)) return;
    try {
      const idsStr = selectedMeds.join(",");
      const res = await fetch(`/api/medicine?id=${idsStr}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Selected medicines deleted successfully!");
        setSelectedMeds([]);
        fetchMedicines(true, searchTerm);
      } else {
        toast.error("Failed to delete selected medicines!");
      }
    } catch (error) {
      toast.error("Error deleting selected medicines!");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch("/api/medicine", {
        method: "PUT",
        body: JSON.stringify({ id: editMed._id, ...editMed }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        toast.success("Stock updated successfully!");
        setEditMed(null);
        fetchMedicines(true, searchTerm);
      }
    } catch (error) {
      toast.error("Update failed!");
    }
    setIsUpdating(false);
  };

  const toggleSelection = (id) => {
    if (selectedMeds.includes(id)) {
      setSelectedMeds(selectedMeds.filter(medId => medId !== id));
    } else {
      setSelectedMeds([...selectedMeds, id]);
    }
  };

  const generateBulkQueue = () => {
    const queue = [];
    selectedMeds.forEach(id => {
      const med = medicines.find(m => m._id === id);
      const copies = printCopies[id] || 1;
      for (let i = 0; i < copies; i++) {
        queue.push(med);
      }
    });
    
    if (queue.length === 0) {
      toast.error("No medicine selected!");
      return;
    }
    
    setPrintQueue(queue); 
  };

  const handleSinglePrint = (med) => {
    setActivePrintMed(med);
    setSinglePrintQty(1);
  };

  const confirmSinglePrint = () => {
    if (singlePrintQty <= 0) {
      toast.error("Please enter a valid print quantity!");
      return;
    }

    const queue = [];
    for (let i = 0; i < singlePrintQty; i++) {
      queue.push(activePrintMed);
    }
    setPrintQueue(queue);
    setActivePrintMed(null);
  };

  if (loading && medicines.length === 0) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="font-medium">Loading Inventory...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
      <Toaster position="top-center" />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center mr-3 md:mr-4 border border-emerald-100 shadow-sm shrink-0">
            <Package className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight leading-tight">Medicine Inventory</h1>
            <p className="text-slate-500 text-[10px] md:text-sm font-medium mt-0.5">Manage your entire stock and barcodes.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center bg-white border border-slate-200 text-slate-600 px-3 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold shadow-sm hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {selectedMeds.length > 0 && (
            <>
              <button 
                onClick={handleBulkDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center transition-all shadow-md shrink-0 animate-in fade-in"
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5 mr-2 text-rose-200" />
                Delete ({selectedMeds.length})
              </button>
              
              <button 
                onClick={() => setShowBulkModal(true)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center transition-all shadow-md shrink-0 animate-in fade-in"
              >
                <Printer className="w-4 h-4 md:w-5 md:h-5 mr-2 text-emerald-400" />
                Print ({selectedMeds.length})
              </button>
            </>
          )}

          <div className="relative w-full sm:w-80 group">
            <input 
              type="text" 
              placeholder="Search Name, Location or Barcode..." 
              className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl md:rounded-2xl pl-10 md:pl-12 pr-4 py-3 md:py-3.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm md:text-base font-medium shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3.5 md:left-4 top-3 md:top-4 text-slate-400 w-4 h-4 md:w-5 md:h-5 group-focus-within:text-emerald-500 transition-colors" />
          </div>
        </div>
      </div>

      {medicines.length === 0 ? (
        <div className="bg-white rounded-2xl md:rounded-3xl p-10 md:p-20 text-center border border-dashed border-slate-300">
          <Package className="w-12 h-12 md:w-16 md:h-16 text-slate-200 mx-auto mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-bold text-slate-600">No medicines found</h3>
          <p className="text-xs md:text-sm text-slate-400 mt-1">Try a different search term or add a new entry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {medicines.map((med) => {
            const isSelected = selectedMeds.includes(med._id);
            return (
              <div 
                key={med._id} 
                className={`bg-white rounded-2xl md:rounded-3xl border shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 overflow-hidden group ${isSelected ? 'border-emerald-400 ring-2 ring-emerald-50' : 'border-slate-200'}`}
              >
                <div className="p-4 md:p-6">
                  <div className="flex justify-between items-start gap-4 mb-3 md:mb-4">
                    <div className="flex items-start gap-2.5 md:gap-3 flex-1 min-w-0">
                      <button onClick={() => toggleSelection(med._id)} className="mt-0.5 md:mt-1 focus:outline-none shrink-0">
                        {isSelected ? 
                          <CheckSquare className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" /> : 
                          <Square className="w-4 h-4 md:w-5 md:h-5 text-slate-300 hover:text-emerald-400 transition-colors" />
                        }
                      </button>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm md:text-lg text-slate-800 group-hover:text-emerald-600 transition-colors leading-tight truncate" title={med.name}>{med.name}</h3>
                        <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5 md:mt-1">ID: {med.barcodeId}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={() => setEditMed(med)}
                        className="p-1.5 md:p-2 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg md:rounded-xl transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(med._id)}
                        className="p-1.5 md:p-2 bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-lg md:rounded-xl transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-5 pl-7 md:pl-8">
                    <div className="bg-slate-50 p-2 md:p-3 rounded-xl md:rounded-2xl">
                      <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase mb-0.5 md:mb-1 tracking-wider">Stock Qty</p>
                      <p className={`text-base md:text-lg font-extrabold ${med.quantity < 10 ? 'text-rose-500' : 'text-slate-700'}`}>
                        {med.quantity} <span className="text-[8px] md:text-[10px] font-medium text-slate-400">Units</span>
                      </p>
                    </div>
                    <div className="bg-slate-50 p-2 md:p-3 rounded-xl md:rounded-2xl">
                      <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase mb-0.5 md:mb-1 tracking-wider">MRP ₹</p>
                      <p className="text-base md:text-lg font-extrabold text-emerald-600">
                        ₹{med.mrp}
                      </p>
                    </div>
                  </div>

                  <div className="pl-7 md:pl-8 mb-4 md:mb-5 flex justify-center">
                    <div className={`bg-white px-3 py-2 rounded-xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] inline-flex flex-col items-center ${
                      printSettings.useGuidelines ? 'border border-dashed border-rose-400' : 'border border-slate-200'
                    }`}>
                      <Barcode 
                        value={med.barcodeId} 
                        format={printSettings.barcodeFormat === "EAN8" && !/^\d{8}$/.test(med.barcodeId) ? "CODE128" : printSettings.barcodeFormat} 
                        width={printSettings.lineThickness ? printSettings.lineThickness * 0.8 : 0.9} 
                        height={(printSettings.barcodeHeight ?? 15) * 1.2} 
                        fontSize={printSettings.fontSize + 1} 
                        margin={2} 
                        marginLeft={printSettings.quietZone ?? 15} 
                        marginRight={printSettings.quietZone ?? 15} 
                        displayValue={true} 
                        background="transparent"
                        lineColor="#334155" 
                      />
                      {(printSettings.showBillNumber || printSettings.showPurchaseDate) && (
                        <div className="w-full text-center mt-1" style={{ fontSize: `${printSettings.fontSize}px` }}>
                          <p className="font-extrabold text-slate-700 uppercase tracking-tight leading-tight truncate">
                            {printSettings.showBillNumber && `B: ${med.billNumber || "N/A"}`} {printSettings.showPurchaseDate && `P: ${med.purchaseDate ? formatDate(med.purchaseDate) : "N/A"}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] md:text-xs font-bold text-slate-500 mb-4 md:mb-6 pl-7 md:pl-8">
                    <div className="flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1 text-slate-300 hidden md:block" />
                      Location: <span className="text-slate-800 ml-1">{med.batch}</span>
                    </div>
                    <div className="flex items-center">
                      Exp: <span className="text-slate-800 ml-1">{formatExpiryDate(med.expiryDate)}</span>
                    </div>
                  </div>

                  <div className="pt-3 md:pt-4 border-t border-slate-50 flex flex-col items-center">
                    <button 
                      onClick={() => handleSinglePrint(med)} 
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold flex items-center justify-center transition-all"
                    >
                      <Printer className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Print Single Label
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[24px] md:rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 p-4 md:p-6 flex justify-between items-center text-white">
              <div className="flex items-center">
                <Printer className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 text-emerald-400" />
                <h2 className="text-base md:text-lg font-bold tracking-tight">Bulk Print Setup</h2>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="bg-white/10 hover:bg-white/20 p-1.5 md:p-2 rounded-full transition-colors">
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-50">
              <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 md:mb-4">Set Copies for Each Medicine</p>
              <div className="space-y-2.5 md:space-y-3">
                {selectedMeds.map(id => {
                  const med = medicines.find(m => m._id === id);
                  if (!med) return null;
                  return (
                    <div key={id} className="flex items-center justify-between bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex-1 pr-3 md:pr-4 min-w-0">
                        <p className="font-bold text-xs md:text-sm text-slate-800 truncate">{med.name}</p>
                        <p className="text-[9px] md:text-[10px] text-slate-500 mt-0.5">Stock: {med.quantity} | {med.barcodeId}</p>
                      </div>
                      <div className="flex items-center space-x-1.5 md:space-x-2 shrink-0">
                        <label className="text-[10px] md:text-xs font-bold text-slate-400">Copies:</label>
                        <input 
                          type="number" min="1" max="100"
                          className="w-12 md:w-16 bg-slate-50 border border-slate-200 px-1 md:px-2 py-1 md:py-1.5 rounded-lg text-center text-xs md:text-sm font-bold outline-none focus:border-emerald-400"
                          value={printCopies[id] || 1}
                          onChange={(e) => setPrintCopies({...printCopies, [id]: parseInt(e.target.value) || 1})}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 md:p-6 bg-white border-t border-slate-200 flex gap-3 md:gap-4">
              <button 
                onClick={() => setShowBulkModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={generateBulkQueue}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 md:py-3.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center"
              >
                <Printer className="w-4 h-4 mr-1.5 md:mr-2" /> Start Print
              </button>
            </div>
          </div>
        </div>
      )}

      {editMed && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[24px] md:rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-emerald-500 p-4 md:p-6 flex justify-between items-center text-white">
              <div className="flex items-center">
                <Edit className="w-4 h-4 md:w-5 h-5 mr-2 md:mr-3" />
                <h2 className="text-base md:text-lg font-bold tracking-tight">Update Details</h2>
              </div>
              <button onClick={() => setEditMed(null)} className="bg-white/20 hover:bg-white/30 p-1.5 md:p-2 rounded-full transition-colors">
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-5 md:p-8 space-y-4 md:space-y-5">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">Medicine Name</label>
                <input 
                  type="text" required
                  className="w-full bg-slate-50 border border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl text-sm md:text-base focus:ring-4 focus:ring-emerald-50 outline-none font-bold"
                  value={editMed.name} 
                  onChange={(e) => setEditMed({...editMed, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-5">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2 text-rose-500">Edit Stock</label>
                  <input 
                    type="number" required
                    className="w-full bg-slate-50 border border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl text-sm md:text-base focus:ring-4 focus:ring-emerald-50 outline-none font-bold"
                    value={editMed.quantity} 
                    onChange={(e) => setEditMed({...editMed, quantity: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">Price ₹</label>
                  <input 
                    type="number" required
                    className="w-full bg-slate-50 border border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl text-sm md:text-base focus:ring-4 focus:ring-emerald-50 outline-none font-bold"
                    value={editMed.mrp} 
                    onChange={(e) => setEditMed({...editMed, mrp: e.target.value})}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isUpdating}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-base font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center mt-2"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : "Confirm Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {activePrintMed && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[24px] md:rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-800 p-4 md:p-6 flex justify-between items-center text-white">
              <div className="flex items-center">
                <Printer className="w-4 h-4 md:w-5 h-5 mr-2 md:mr-3 text-emerald-400" />
                <h2 className="text-sm md:text-base font-bold tracking-tight">Print Labels</h2>
              </div>
              <button onClick={() => setActivePrintMed(null)} className="bg-white/10 hover:bg-white/20 p-1.5 md:p-2 rounded-full transition-colors">
                <X className="w-4 h-4 md:w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-center bg-slate-50">
              <div>
                <p className="font-bold text-sm md:text-base text-slate-800 truncate mb-1">{activePrintMed.name}</p>
                <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">ID: {activePrintMed.barcodeId}</p>
              </div>

              {/* Quantity Counter box */}
              <div className="flex items-center justify-center space-x-4 py-2">
                <button 
                  type="button"
                  onClick={() => setSinglePrintQty(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 bg-white border border-slate-200 hover:bg-slate-105 rounded-xl flex items-center justify-center font-bold text-slate-600 transition-colors shadow-sm select-none"
                >
                  -
                </button>
                <input 
                  type="number"
                  min="1"
                  max="100"
                  className="w-20 bg-white border border-slate-200 p-2 rounded-xl text-center font-extrabold text-sm md:text-base text-slate-800 outline-none focus:border-emerald-500 shadow-sm"
                  value={singlePrintQty}
                  onChange={(e) => setSinglePrintQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <button 
                  type="button"
                  onClick={() => setSinglePrintQty(prev => Math.min(100, prev + 1))}
                  className="w-10 h-10 bg-white border border-slate-200 hover:bg-slate-105 rounded-xl flex items-center justify-center font-bold text-slate-600 transition-colors shadow-sm select-none"
                >
                  +
                </button>
              </div>
              
              <p className="text-[10px] text-slate-450 font-semibold">
                Will render in {printSettings.layoutType} layout using saved configuration.
              </p>
            </div>

            <div className="p-4 md:p-6 bg-white border-t border-slate-200 flex gap-3">
              <button 
                onClick={() => setActivePrintMed(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmSinglePrint}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Start Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden printable container for barcode label */}
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
        <div ref={printRef}>
          <style type="text/css" media="print">
            {`
              @page { 
                size: ${printSettings.layoutType === "2-UP" ? (printSettings.width * 2 + Number(printSettings.gap)) : printSettings.width}mm ${printSettings.height}mm; 
                margin: 0mm !important; 
              }
              body { 
                margin: 0mm !important; 
                padding: 0mm !important; 
              }
              .thermal-row {
                display: flex;
                flex-direction: row;
                width: ${printSettings.layoutType === "2-UP" ? (printSettings.width * 2 + Number(printSettings.gap)) : printSettings.width}mm !important;
                height: ${printSettings.height}mm !important;
                box-sizing: border-box;
                background-color: white;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .thermal-label {
                width: ${printSettings.width}mm !important; 
                height: ${printSettings.height}mm !important; 
                display: flex;
                flex-direction: column; 
                justify-content: center; 
                align-items: center;
                box-sizing: border-box; 
                background-color: white;
                overflow: hidden !important; 
                padding: 1.5mm 3.5mm !important; 
                ${printSettings.useGuidelines ? 'border: 0.1mm solid red !important;' : 'border: none !important;'}
              }
              .label-gap {
                width: ${printSettings.gap}mm !important;
                height: ${printSettings.height}mm !important;
                background-color: white;
                flex-shrink: 0;
              }
            `}
          </style>

          {printSettings.layoutType === "2-UP" ? (
            (() => {
              const chunks = [];
              for (let i = 0; i < printQueue.length; i += 2) {
                chunks.push([printQueue[i], printQueue[i + 1] || null]);
              }
              return chunks.map((chunk, index) => (
                <div key={index} className="thermal-row">
                  {/* Sticker 1 */}
                  {chunk[0] && (
                    <div className="thermal-label">
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', overflow: 'hidden' }}>
                        <Barcode 
                          value={chunk[0].barcodeId} 
                          format={printSettings.barcodeFormat === "EAN8" && !/^\d{8}$/.test(chunk[0].barcodeId) ? "CODE128" : printSettings.barcodeFormat} 
                          renderer="svg"     
                          width={printSettings.lineThickness ?? 1.2}        
                          height={(printSettings.barcodeHeight ?? 15) * 2}        
                          fontSize={printSettings.fontSize}      
                          margin={2}         
                          marginLeft={printSettings.quietZone ?? 15}    
                          marginRight={printSettings.quietZone ?? 15}   
                          textMargin={1}     
                          background="#ffffff" 
                          lineColor="#000000" 
                          displayValue={true} 
                        />
                      </div>
                      {(printSettings.showBillNumber || printSettings.showPurchaseDate) && (
                        <div style={{ width: '100%', textAlign: 'center', marginTop: '1.5px' }}>
                          <p style={{ margin: 0, padding: 0, fontSize: `${printSettings.fontSize}px`, fontWeight: 'bold', color: 'black', textTransform: 'uppercase', fontFamily: 'sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1' }}>
                            {printSettings.showBillNumber && `BILL: ${chunk[0].billNumber || "N/A"}`} {printSettings.showBillNumber && printSettings.showPurchaseDate && "|"} {printSettings.showPurchaseDate && `PUR: ${chunk[0].purchaseDate ? formatDate(chunk[0].purchaseDate) : "N/A"}`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="label-gap"></div>

                  {/* Sticker 2 */}
                  <div className="thermal-label">
                    {chunk[1] ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', overflow: 'hidden' }}>
                          <Barcode 
                            value={chunk[1].barcodeId} 
                            format={printSettings.barcodeFormat === "EAN8" && !/^\d{8}$/.test(chunk[1].barcodeId) ? "CODE128" : printSettings.barcodeFormat} 
                            renderer="svg"     
                            width={printSettings.lineThickness ?? 1.2}        
                            height={(printSettings.barcodeHeight ?? 15) * 2}        
                            fontSize={printSettings.fontSize}      
                            margin={2}         
                            marginLeft={printSettings.quietZone ?? 15}    
                            marginRight={printSettings.quietZone ?? 15}   
                            textMargin={1}     
                            background="#ffffff" 
                            lineColor="#000000" 
                            displayValue={true} 
                          />
                        </div>
                        {(printSettings.showBillNumber || printSettings.showPurchaseDate) && (
                          <div style={{ width: '100%', textAlign: 'center', marginTop: '1.5px' }}>
                            <p style={{ margin: 0, padding: 0, fontSize: `${printSettings.fontSize}px`, fontWeight: 'bold', color: 'black', textTransform: 'uppercase', fontFamily: 'sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1' }}>
                              {printSettings.showBillNumber && `BILL: ${chunk[1].billNumber || "N/A"}`} {printSettings.showBillNumber && printSettings.showPurchaseDate && "|"} {printSettings.showPurchaseDate && `PUR: ${chunk[1].purchaseDate ? formatDate(chunk[1].purchaseDate) : "N/A"}`}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ visibility: 'hidden' }}>Placeholder</div>
                    )}
                  </div>
                </div>
              ));
            })()
          ) : (
            // 1-UP Layout
            printQueue.map((item, index) => (
              <div key={`${item._id}-${index}`} className="thermal-row">
                <div className="thermal-label">
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', overflow: 'hidden' }}>
                    <Barcode 
                      value={item.barcodeId} 
                      format={printSettings.barcodeFormat === "EAN8" && !/^\d{8}$/.test(item.barcodeId) ? "CODE128" : printSettings.barcodeFormat} 
                      renderer="svg"     
                      width={printSettings.lineThickness ?? 1.2}        
                      height={(printSettings.barcodeHeight ?? 15) * 2}        
                      fontSize={printSettings.fontSize}      
                      margin={2}         
                      marginLeft={printSettings.quietZone ?? 15}    
                      marginRight={printSettings.quietZone ?? 15}   
                      textMargin={1}     
                      background="#ffffff" 
                      lineColor="#000000" 
                      displayValue={true} 
                    />
                  </div>
                  {(printSettings.showBillNumber || printSettings.showPurchaseDate) && (
                    <div style={{ width: '100%', textAlign: 'center', marginTop: '1.5px' }}>
                      <p style={{ margin: 0, padding: 0, fontSize: `${printSettings.fontSize}px`, fontWeight: 'bold', color: 'black', textTransform: 'uppercase', fontFamily: 'sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1' }}>
                        {printSettings.showBillNumber && `BILL: ${item.billNumber || "N/A"}`} {printSettings.showBillNumber && printSettings.showPurchaseDate && "|"} {printSettings.showPurchaseDate && `PUR: ${item.purchaseDate ? formatDate(item.purchaseDate) : "N/A"}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}