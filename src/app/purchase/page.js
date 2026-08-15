"use client";
import { useState, useRef, useEffect } from "react";
import Barcode from "react-barcode";
import { PackagePlus, Loader2, CheckCircle2, ChevronDown, Check, Building2, X, AlertCircle } from "lucide-react";
import toast, { Toaster } from "react-hot-toast"; 
import { formatDate } from "@/lib/formatDate";

const getTodayInputString = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = String(today.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const formatPurchaseDateInput = (value) => {
  let clean = value.replace(/\D/g, "");
  if (clean.length > 6) clean = clean.slice(0, 6);
  
  if (clean.length <= 2) {
    return clean;
  }
  if (clean.length <= 4) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
};

const formatExpiryDateInput = (value) => {
  let clean = value.replace(/\D/g, "");
  if (clean.length > 4) clean = clean.slice(0, 4);
  
  if (clean.length <= 2) {
    return clean;
  }
  return `${clean.slice(0, 2)}/${clean.slice(2)}`;
};

export default function PurchaseEntry() {
  const [formData, setFormData] = useState({
    name: "", batch: "", expiryDate: "", quantity: "", distributor: "", mrp: "", billNumber: "", purchaseDate: ""
  });
  const [purchaseDateInput, setPurchaseDateInput] = useState(getTodayInputString());
  const [expiryDateInput, setExpiryDateInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedMed, setSavedMed] = useState(null);

  // Distributor states
  const [distributorObjects, setDistributorObjects] = useState([]);
  const [distributorOpen, setDistributorOpen] = useState(false);
  const [highlightedDistIndex, setHighlightedDistIndex] = useState(-1);
  const distributorWrapperRef = useRef(null);

  // Close distributor dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (distributorWrapperRef.current && !distributorWrapperRef.current.contains(event.target)) {
        setDistributorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Printer config states
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

  // Input refs for keyboard navigation
  const nameRef = useRef(null);
  const batchRef = useRef(null); // Location
  const qtyRef = useRef(null);
  const billNumRef = useRef(null);
  const purDateRef = useRef(null);
  const mrpRef = useRef(null);
  const expiryDateRef = useRef(null);
  const distributorRef = useRef(null);
  const submitBtnRef = useRef(null);

  const fetchDistributors = async () => {
    try {
      const resModal = await fetch("/api/distributors?all=true");
      const dataModal = await resModal.json();
      if (dataModal.success) {
        setDistributorObjects(dataModal.distributors || []);
      }
    } catch (error) {
      console.error("Error fetching distributors:", error);
    }
  };

  // Load distributor suggestions and check localStorage for default values
  useEffect(() => {
    fetchDistributors();
    loadPrintSettings();

    // Session persistence from localStorage
    const savedBatch = localStorage.getItem("last_batch");
    const savedBill = localStorage.getItem("last_billNumber");
    const savedDist = localStorage.getItem("last_distributor");
    const savedPurDate = localStorage.getItem("last_purchaseDateInput");

    if (savedBatch || savedBill || savedDist || savedPurDate) {
      setFormData(prev => ({
        ...prev,
        batch: savedBatch || "",
        billNumber: savedBill || "",
        distributor: savedDist || ""
      }));
      if (savedPurDate) {
        setPurchaseDateInput(savedPurDate);
      }
    }

    // Auto focus name input on load
    nameRef.current?.focus();
  }, []);

  // Keyboard navigation helper
  const handleEnterKey = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  // Input change persistence logic that resets barcode preview when user begins new entries
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (savedMed) setSavedMed(null);
  };

  const filteredDistributors = distributorObjects.filter(d => 
    (d.name || "").toLowerCase().includes((formData.distributor || "").toLowerCase().trim())
  );

  const isExactDistMatch = distributorObjects.some(d => 
    (d.name || "").toLowerCase().trim() === (formData.distributor || "").toLowerCase().trim()
  );

  const selectDistributor = (name) => {
    handleFieldChange("distributor", name);
    setDistributorOpen(false);
    setHighlightedDistIndex(-1);
    submitBtnRef.current?.focus();
  };

  const handleDistributorKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!distributorOpen) {
        setDistributorOpen(true);
        setHighlightedDistIndex(0);
      } else {
        setHighlightedDistIndex(prev => 
          prev < filteredDistributors.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedDistIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      if (distributorOpen && highlightedDistIndex >= 0 && filteredDistributors[highlightedDistIndex]) {
        e.preventDefault();
        selectDistributor(filteredDistributors[highlightedDistIndex].name);
      } else if (isExactDistMatch) {
        e.preventDefault();
        const matched = distributorObjects.find(d => 
          (d.name || "").toLowerCase().trim() === (formData.distributor || "").toLowerCase().trim()
        );
        if (matched) {
          selectDistributor(matched.name);
        } else {
          setDistributorOpen(false);
          submitBtnRef.current?.focus();
        }
      } else if (formData.distributor.trim()) {
        e.preventDefault();
        toast.error("Please select a registered distributor from the list!");
        setDistributorOpen(true);
      }
    } else if (e.key === "Escape") {
      setDistributorOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Parse purchaseDate (DD/MM/YY)
    const purchaseParts = purchaseDateInput.split("/");
    if (purchaseParts.length !== 3 || purchaseDateInput.length !== 8) {
      toast.error("Please enter a valid Purchase Date in DD/MM/YY format!");
      return;
    }
    const [pDay, pMonth, pYear] = purchaseParts.map(Number);
    const fullPYear = 2000 + pYear;
    const parsedPurchaseDate = `${fullPYear}-${String(pMonth).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
    const pDateObj = new Date(parsedPurchaseDate);
    if (isNaN(pDateObj.getTime()) || pMonth < 1 || pMonth > 12 || pDay < 1 || pDay > 31) {
      toast.error("Invalid Purchase Date!");
      return;
    }

    // Parse expiryDate (MM/YY)
    const expiryParts = expiryDateInput.split("/");
    if (expiryParts.length !== 2 || expiryDateInput.length !== 5) {
      toast.error("Please enter a valid Expiry Date in MM/YY format!");
      return;
    }
    const [eMonth, eYear] = expiryParts.map(Number);
    const fullEYear = 2000 + eYear;
    const lastDay = new Date(fullEYear, eMonth, 0).getDate();
    const parsedExpiryDate = `${fullEYear}-${String(eMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const eDateObj = new Date(parsedExpiryDate);
    if (isNaN(eDateObj.getTime()) || eMonth < 1 || eMonth > 12) {
      toast.error("Invalid Expiry Date!");
      return;
    }

    // Expiry Date Validation (Past date not allowed for Expiry)
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    if (eDateObj <= today) {
      toast.error("Expiry date cannot be today or in the past!");
      return;
    }

    // Enforce selecting a valid registered distributor
    if (!formData.distributor.trim() || !isExactDistMatch) {
      toast.error("Please select a registered distributor from the list!");
      distributorRef.current?.focus();
      setDistributorOpen(true);
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        purchaseDate: parsedPurchaseDate,
        expiryDate: parsedExpiryDate
      };

      const res = await fetch("/api/medicine", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      });
      
      const data = await res.json();
      if (data.success) {
        setSavedMed(data.medicine);
        toast.success(`${data.medicine.name} saved to database successfully!`); 

        // Store persistent fields in localStorage
        localStorage.setItem("last_batch", formData.batch);
        localStorage.setItem("last_billNumber", formData.billNumber);
        localStorage.setItem("last_distributor", formData.distributor);
        localStorage.setItem("last_purchaseDateInput", purchaseDateInput);

        fetchDistributors();
        
        // Reset only non-persistent fields
        setFormData(prev => ({
          name: "",
          batch: prev.batch, // Retained
          expiryDate: "",
          quantity: "",
          distributor: prev.distributor, // Retained
          mrp: "",
          billNumber: prev.billNumber, // Retained
          purchaseDate: prev.purchaseDate // Retained
        }));
        
        setExpiryDateInput("");
        
        // Shift focus back to medicine name for the next entry
        nameRef.current?.focus();
      } else {
        toast.error("Error: " + data.error);
      }
    } catch (error) {
      toast.error("Something went wrong! Please check your network.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      <Toaster position="top-center" reverseOrder={false} /> 
      
      <div className="flex items-center">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center mr-3 md:mr-4 border border-emerald-100 shrink-0 shadow-sm">
          <PackagePlus className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight tracking-tight">Smart Purchase Entry</h1>
          <p className="text-slate-500 text-[10px] md:text-sm font-medium mt-0.5">Enter new stock, manage batch locations, and generate dynamic barcodes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left Column: Form Box */}
        <div className="lg:col-span-6 bg-white p-6 md:p-8 rounded-[24px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 md:mb-2">Medicine Name</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Paracetamol 500mg"
                ref={nameRef}
                onKeyDown={(e) => handleEnterKey(e, batchRef)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm md:text-base font-medium"
                value={formData.name} 
                onChange={(e) => handleFieldChange("name", e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-5">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 md:mb-2">Location</label>
                <input type="text" required placeholder="e.g. Rack-A Shelf-2"
                  ref={batchRef}
                  onKeyDown={(e) => handleEnterKey(e, qtyRef)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm md:text-base font-medium"
                  value={formData.batch} onChange={(e) => handleFieldChange("batch", e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 md:mb-2">Quantity</label>
                <input type="number" required placeholder="0" min="1"
                  ref={qtyRef}
                  onKeyDown={(e) => handleEnterKey(e, billNumRef)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm md:text-base font-medium"
                  value={formData.quantity} onChange={(e) => handleFieldChange("quantity", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-5">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 md:mb-2">Dist. Bill Number</label>
                <input type="text" required placeholder="e.g. INV-1002"
                  ref={billNumRef}
                  onKeyDown={(e) => handleEnterKey(e, purDateRef)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm md:text-base font-medium"
                  value={formData.billNumber} onChange={(e) => handleFieldChange("billNumber", e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 md:mb-2">Purchase Date</label>
                <input type="text" required placeholder="DD/MM/YY"
                  ref={purDateRef}
                  onKeyDown={(e) => handleEnterKey(e, mrpRef)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm md:text-base font-medium"
                  value={purchaseDateInput} onChange={(e) => {
                    setPurchaseDateInput(formatPurchaseDateInput(e.target.value));
                    if (savedMed) setSavedMed(null);
                  }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-5">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 md:mb-2">MRP (₹)</label>
                <input type="number" required placeholder="0.00" step="0.01" min="0"
                  ref={mrpRef}
                  onKeyDown={(e) => handleEnterKey(e, expiryDateRef)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm md:text-base font-medium"
                  value={formData.mrp} onChange={(e) => handleFieldChange("mrp", e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 md:mb-2">Expiry Date (MM/YY)</label>
                <input type="text" required placeholder="MM/YY"
                  ref={expiryDateRef}
                  onKeyDown={(e) => handleEnterKey(e, distributorRef)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm md:text-base font-medium"
                  value={expiryDateInput} onChange={(e) => {
                    setExpiryDateInput(formatExpiryDateInput(e.target.value));
                    if (savedMed) setSavedMed(null);
                  }} />
              </div>
            </div>

            <div ref={distributorWrapperRef} className="relative">
              <div className="flex justify-between items-center mb-1.5 md:mb-2">
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Distributor / Agency <span className="text-rose-500">*</span>
                </label>
                {distributorObjects.length > 0 && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {distributorObjects.length} Registered
                  </span>
                )}
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  required 
                  ref={distributorRef}
                  placeholder="Type or search distributor agency..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl md:rounded-2xl pl-4 pr-12 py-2.5 md:py-3 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm md:text-base font-medium"
                  value={formData.distributor} 
                  onFocus={() => setDistributorOpen(true)}
                  onChange={(e) => {
                    handleFieldChange("distributor", e.target.value);
                    setDistributorOpen(true);
                    setHighlightedDistIndex(-1);
                  }}
                  onKeyDown={handleDistributorKeyDown}
                  autoComplete="off"
                />

                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {formData.distributor && (
                    <button
                      type="button"
                      onClick={() => {
                        handleFieldChange("distributor", "");
                        setDistributorOpen(true);
                        distributorRef.current?.focus();
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDistributorOpen(prev => !prev);
                      distributorRef.current?.focus();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                    title="Toggle list"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${distributorOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Advanced Suggestions Dropdown */}
              {distributorOpen && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                  {filteredDistributors.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 font-medium">
                      <p className="font-bold text-slate-700">No matching registered distributor found.</p>
                      <p className="text-[10px] text-amber-600 mt-1">
                        New distributors can only be created from the <strong>Distributors</strong> management tab.
                      </p>
                    </div>
                  ) : (
                    filteredDistributors.map((dist, idx) => {
                      const isSelected = (formData.distributor || "").toLowerCase().trim() === (dist.name || "").toLowerCase().trim();
                      const isHighlighted = idx === highlightedDistIndex;

                      return (
                        <div
                          key={dist._id || dist.name}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectDistributor(dist.name);
                          }}
                          onMouseEnter={() => setHighlightedDistIndex(idx)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                            isSelected 
                              ? 'bg-emerald-50 text-emerald-900 font-bold' 
                              : isHighlighted 
                                ? 'bg-slate-50 text-slate-900' 
                                : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-800 truncate text-xs md:text-sm">{dist.name}</p>
                              {(dist.contactPerson || dist.phone || dist.gstin) && (
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                                  {dist.contactPerson && <span>👤 {dist.contactPerson}</span>}
                                  {dist.phone && <span>📞 {dist.phone}</span>}
                                  {dist.gstin && <span>GST: {dist.gstin}</span>}
                                </div>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              ref={submitBtnRef}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs md:text-sm px-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-2 md:mt-4 focus:outline-none focus:ring-4 focus:ring-emerald-400/20"
            >
              {loading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : "Save Stock Entry"}
            </button>
          </form>
        </div>

        {/* Right Column: Dynamic Barcode Confirmation (No print options) */}
        <div className="lg:col-span-6 bg-slate-100/50 p-6 md:p-8 rounded-[24px] md:rounded-3xl border border-slate-200 flex flex-col items-center justify-center min-h-[300px] lg:min-h-[450px]">
          
          {!savedMed ? (
            <div className="text-center text-slate-400 max-w-sm">
              <PackagePlus className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-30 text-slate-650" />
              <p className="font-semibold text-xs md:text-sm tracking-wide text-slate-500 uppercase">Awaiting Entry</p>
              <p className="text-[10px] md:text-xs text-slate-400 mt-1">Submit the purchase form to view the auto-generated barcode and stock summary.</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-200 space-y-5">
              
              <div className="flex items-center text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 text-[10px] md:text-xs shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Stock Saved & Barcode Generated!
              </div>

              {/* Dynamic Barcode Preview Card */}
              <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_-4px_rgba(0,0,0,0.05)] border border-slate-200 max-w-[280px] w-full flex flex-col items-center select-none">
                
                {/* Visual Barcode element dynamically calibrated */}
                <div className="w-full flex items-center justify-center select-none py-2">
                  <Barcode 
                    value={savedMed.barcodeId} 
                    format={printSettings.barcodeFormat === "EAN8" && !/^\d{8}$/.test(savedMed.barcodeId) ? "CODE128" : printSettings.barcodeFormat} 
                    width={
                      (printSettings.barcodeFormat === "EAN8" && !/^\d{8}$/.test(savedMed.barcodeId) ? "CODE128" : printSettings.barcodeFormat) === "CODE128" 
                        ? (printSettings.lineThickness ? printSettings.lineThickness * 0.7 : 0.8) 
                        : (printSettings.lineThickness ?? 1.2)
                    } 
                    height={(printSettings.barcodeHeight ?? 15) * 1.5} 
                    fontSize={printSettings.fontSize + 1} 
                    margin={2} 
                    marginLeft={printSettings.quietZone ?? 15} 
                    marginRight={printSettings.quietZone ?? 15} 
                    background="#ffffff" 
                    lineColor="#000000" 
                    displayValue={true} 
                  />
                </div>

                {/* Additional calibrated metadata display */}
                {(printSettings.showBillNumber || printSettings.showPurchaseDate) && (
                  <div className="w-full text-center mt-1 border-t border-slate-100 pt-1.5" style={{ fontSize: `${printSettings.fontSize}px` }}>
                    <p className="font-extrabold text-slate-705 uppercase tracking-tight truncate leading-tight select-none">
                      {printSettings.showBillNumber && `BILL: ${savedMed.billNumber}`} {printSettings.showBillNumber && printSettings.showPurchaseDate && "|"} {printSettings.showPurchaseDate && `PUR: ${formatDate(savedMed.purchaseDate)}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Saved Stock Info list */}
              <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-4 md:p-5 text-xs font-bold text-slate-600 space-y-2.5 shadow-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-400">Medicine Name</span>
                  <span className="text-slate-800">{savedMed.name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-400">Batch Location</span>
                  <span className="text-slate-800">{savedMed.batch}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-400">Quantity Added</span>
                  <span className="text-emerald-600">{savedMed.quantity} units</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-400">MRP Per Unit</span>
                  <span className="text-slate-800">₹{savedMed.mrp}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Distributor</span>
                  <span className="text-slate-800 truncate max-w-[180px]">{savedMed.distributor}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-semibold max-w-xs text-center leading-normal">
                Note: Barcodes have been generated and saved. Go to the **Inventory Page** to run bulk printing or custom single labels.
              </p>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}