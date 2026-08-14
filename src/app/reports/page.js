"use client";
import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { AlertTriangle, TrendingDown, Truck, Loader2, CalendarClock, RefreshCw, Search, X, IndianRupee, ShoppingCart, PackageOpen, Award, Package, Receipt, TrendingUp, Printer, ChevronDown } from "lucide-react";
import { formatDate, formatExpiryDate } from "@/lib/formatDate";

// Reusable Custom Multi-Select Dropdown for Distributors
function DistributorFilterDropdown({ distributors, selectedDists, setSelectedDists, label = "Distributor" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDistributor = (name) => {
    if (selectedDists.includes(name)) {
      setSelectedDists(selectedDists.filter(n => n !== name));
    } else {
      setSelectedDists([...selectedDists, name]);
    }
  };

  const toggleAll = () => {
    if (selectedDists.length === distributors.length) {
      setSelectedDists([]);
    } else {
      setSelectedDists([...distributors]);
    }
  };

  const filtered = distributors.filter(d => d.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={dropdownRef} className="relative inline-block text-left w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-200 text-xs font-bold rounded-lg shadow-sm transition-all focus:outline-none h-8"
      >
        <span className="truncate max-w-[120px]">
          {selectedDists.length === 0 
            ? `All ${label}s` 
            : selectedDists.length === 1 
              ? selectedDists[0] 
              : `${selectedDists.length} ${label}s`}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-60 bg-white border border-slate-100 rounded-xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] z-[110] p-3 space-y-2">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-400"
          />
          
          <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1">
            <label className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={selectedDists.length === distributors.length || selectedDists.length === 0}
                onChange={toggleAll}
                className="rounded border-slate-350 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0 w-3.5 h-3.5"
              />
              <span>Select All</span>
            </label>
            
            {filtered.map((name) => {
              const isChecked = selectedDists.includes(name);
              return (
                <label key={name} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleDistributor(name)}
                    className="rounded border-slate-350 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0 w-3.5 h-3.5"
                  />
                  <span className="truncate">{name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const [data, setData] = useState({ expiringSoon: [], lowStock: [], distributorStock: [], todayOverview: {} });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [showAllDistributors, setShowAllDistributors] = useState(false);
  const [distributorSearch, setDistributorSearch] = useState("");
  
  const [showSoldItemsModal, setShowSoldItemsModal] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  const [dateFilter, setDateFilter] = useState("today"); // today, yesterday, 7days, 15days, 30days, 60days, 90days, customDays, custom
  const [customStartDate, setCustomStartDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [customDays, setCustomDays] = useState(10);

  const [expiryMonths, setExpiryMonths] = useState(3);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Distributor filter states
  const [selectedExpiryDists, setSelectedExpiryDists] = useState([]);
  const [selectedLowStockDists, setSelectedLowStockDists] = useState([]);
  const [selectedSoldDists, setSelectedSoldDists] = useState([]);

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRangeForFilter = (filter) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    if (filter === "today") {
      // default today
    } else if (filter === "yesterday") {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (filter === "7days") {
      start.setDate(today.getDate() - 6);
    } else if (filter === "15days") {
      start.setDate(today.getDate() - 14);
    } else if (filter === "30days") {
      start.setDate(today.getDate() - 29);
    } else if (filter === "60days") {
      start.setDate(today.getDate() - 59);
    } else if (filter === "90days") {
      start.setDate(today.getDate() - 89);
    } else if (filter === "customDays") {
      const days = parseInt(customDays) || 1;
      start.setDate(today.getDate() - (days - 1));
    } else if (filter === "custom") {
      return {
        startDate: customStartDate || getTodayDateString(),
        endDate: customEndDate || getTodayDateString()
      };
    }
    
    const formatDateStr = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      startDate: formatDateStr(start),
      endDate: formatDateStr(end)
    };
  };

  const getSelectedDateLabel = () => {
    if (dateFilter === "today") return "Today";
    if (dateFilter === "yesterday") return "Yesterday";
    if (dateFilter === "7days") return "Last 7 Days";
    if (dateFilter === "15days") return "Last 15 Days";
    if (dateFilter === "30days") return "Last 30 Days";
    if (dateFilter === "60days") return "Last 60 Days";
    if (dateFilter === "90days") return "Last 90 Days";
    if (dateFilter === "customDays") return `Last ${customDays} Days`;
    
    const formatLabel = (dateStr) => {
      if (!dateStr) return "";
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y.slice(-2)}`;
    };
    
    const start = customStartDate ? formatLabel(customStartDate) : "Start";
    const end = customEndDate ? formatLabel(customEndDate) : "End";
    return `${start} to ${end}`;
  };

  // Expiry PDF Printing ref
  const printRef = useRef(null);
  const handleDownloadPDF = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Expiry_Report_${expiryMonths}_Months`,
  });

  // Low stock PDF Printing ref
  const lowStockPrintRef = useRef(null);
  const handleDownloadLowStockPDF = useReactToPrint({
    contentRef: lowStockPrintRef,
    documentTitle: `Low_Stock_Report`,
  });

  const fetchReports = async (isSilent = false, currentExpiryMonths = expiryMonths, currentLowStockThreshold = lowStockThreshold, filter = dateFilter) => {
    if (!isSilent) setLoading(true);
    try {
      const { startDate, endDate } = getDateRangeForFilter(filter);
      const res = await fetch(`/api/reports?expiryMonths=${currentExpiryMonths}&lowStockThreshold=${currentLowStockThreshold}&startDate=${startDate}&endDate=${endDate}`, { cache: "no-store" });
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
    if (!isSilent) setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchReports(true, expiryMonths, lowStockThreshold, dateFilter);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!initialLoaded) {
        await fetchReports(false, expiryMonths, lowStockThreshold, dateFilter);
        if (active) setInitialLoaded(true);
      } else {
        await fetchReports(true, expiryMonths, lowStockThreshold, dateFilter);
      }
    };
    load();
    return () => { active = false; };
  }, [expiryMonths, lowStockThreshold, dateFilter, customStartDate, customEndDate, customDays]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchReports(true, expiryMonths, lowStockThreshold, dateFilter);
    }, 30000);
    return () => clearInterval(interval);
  }, [expiryMonths, lowStockThreshold, dateFilter, customStartDate, customEndDate, customDays]);

  // Extract all unique distributor names from data
  const allDistributors = data.distributorStock?.map(d => d._id).filter(Boolean) || [];

  // Filter lists client-side based on multi-select selections
  const getFilteredExpiry = () => {
    if (selectedExpiryDists.length === 0) return data.expiringSoon || [];
    return (data.expiringSoon || []).filter(med => selectedExpiryDists.includes(med.distributor));
  };

  const getFilteredLowStock = () => {
    if (selectedLowStockDists.length === 0) return data.lowStock || [];
    return (data.lowStock || []).filter(med => selectedLowStockDists.includes(med.distributor));
  };

  const getFilteredSoldItems = () => {
    const transactions = data.todayOverview?.transactions || [];
    if (selectedSoldDists.length === 0) return transactions;
    return transactions.filter(tx => selectedSoldDists.includes(tx.distributor));
  };

  const filteredDistributors = data.distributorStock?.filter((dist) =>
    dist._id?.toLowerCase().includes(distributorSearch.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin text-emerald-500 mb-3 md:mb-4" />
        <p className="font-medium text-sm md:text-base">Loading Smart Reports...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">Profit & Insights Reports</h1>
          <p className="text-slate-500 text-[10px] md:text-sm font-medium mt-0.5 md:mt-1">Track distributor performance, prevent losses, and manage stock.</p>
        </div>
        
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center text-xs md:text-sm font-bold bg-white border border-slate-200 text-slate-600 px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-sm hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 transition-all focus:outline-none w-full md:w-auto shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Today's Flash Report (Daily Insights) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
        
        {/* Revenue */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 md:p-5 rounded-[20px] md:rounded-2xl shadow-lg text-white flex items-center hover:shadow-emerald-500/30 transition-shadow">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mr-4 shrink-0">
                <IndianRupee className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-emerald-100 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">{getSelectedDateLabel()}&apos;s Profit / Revenue</p>
                <p className="text-xl md:text-2xl font-extrabold flex items-center">
                    ₹ {(data.todayOverview?.revenue || 0).toLocaleString('en-IN')}
                </p>
            </div>
        </div>
        
        {/* Items Sold */}
        <div 
          onClick={() => setShowSoldItemsModal(true)}
          className="bg-white p-4 md:p-5 rounded-[20px] md:rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center cursor-pointer hover:border-indigo-100 hover:shadow-md transition-all group"
          title="Click to view details"
        >
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mr-4 shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors text-indigo-500">
                <Package className="w-6 h-6" />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Items Sold ({getSelectedDateLabel()})</p>
                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">Click to View</span>
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-slate-700">
                    {data.todayOverview?.itemsSold || 0}
                </p>
            </div>
        </div>

        {/* Bills Generated */}
        <div className="bg-white p-4 md:p-5 rounded-[20px] md:rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center cursor-pointer hover:border-amber-100 hover:shadow-md transition-all" onClick={() => setShowSoldItemsModal(true)} title="Click to view details">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mr-4 shrink-0">
                <Receipt className="w-6 h-6 text-amber-500" />
            </div>
            <div>
                <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Total Bills ({getSelectedDateLabel()})</p>
                <p className="text-xl md:text-2xl font-extrabold text-slate-700">
                    {data.todayOverview?.billsGenerated || 0}
                </p>
            </div>
        </div>
      </div>

      {/* Top Performing Distributors Section */}
      <div className="space-y-3 md:space-y-4 pt-2">
        <h2 className="text-sm md:text-lg font-bold text-slate-700">Top Performing Distributors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
          {data.distributorStock?.slice(0, 2).map((dist, index) => (
            <div key={dist._id} className="relative bg-white p-4 md:p-5 rounded-[20px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col group hover:border-indigo-100 transition-all">
              
              {index === 0 && (dist?.revenueGenerated || 0) > 0 && (
                <div className="absolute -top-3 -right-2 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center z-10 animate-bounce">
                  <Award className="w-3 h-3 md:w-4 md:h-4 mr-1" /> Top Earner
                </div>
              )}

              <div className="flex items-center mb-4 border-b border-slate-50 pb-4">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center mr-3 md:mr-4 shrink-0 transition-transform group-hover:scale-105 ${index === 0 ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}>
                  <Truck className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Distributor</p>
                  <p className="text-lg md:text-xl font-extrabold text-slate-800 leading-none truncate mt-0.5">{dist._id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Revenue</p>
                  <p className="text-base md:text-xl font-extrabold text-emerald-600 flex items-center justify-end">
                    <IndianRupee className="w-3 h-3 md:w-4 md:h-4 mr-0.5" />
                    {(dist?.revenueGenerated || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:gap-4 bg-slate-50/50 p-2.5 md:p-3 rounded-xl md:rounded-2xl border border-slate-50/80">
                <div className="flex flex-col p-1.5 md:p-2 bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-100">
                  <span className="flex items-center text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1">
                    <ShoppingCart className="w-3 h-3 mr-1 text-indigo-400" /> Items Sold
                  </span>
                  <span className="text-sm md:text-base font-extrabold text-slate-700">{dist?.soldQuantity || 0}</span>
                </div>
                <div className="flex flex-col p-1.5 md:p-2 bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-100">
                  <span className="flex items-center text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1">
                    <PackageOpen className="w-3 h-3 mr-1 text-amber-500" /> Left in Stock
                  </span>
                  <span className="text-sm md:text-base font-extrabold text-slate-700">{dist.totalQuantity || 0} <span className="text-[9px] md:text-[10px] font-medium text-slate-400">({dist.totalItems || 0} Brands)</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {data.distributorStock?.length > 2 && (
          <div className="flex justify-end mt-2 md:mt-0">
            <button
              onClick={() => setShowAllDistributors(true)}
              className="text-xs md:text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 md:px-5 md:py-2.5 rounded-xl transition-colors flex items-center shadow-sm"
            >
              View All Distributors ({data.distributorStock.length})
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        
        {/* Sold Items Report Card */}
        <div className="bg-white rounded-[24px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-emerald-100 overflow-hidden flex flex-col">
          <div className="bg-emerald-50/50 p-4 border-b border-emerald-100 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm md:text-base font-bold text-emerald-700 flex items-center min-w-0">
                <TrendingUp className="w-4 h-4 mr-1.5 shrink-0" /> 
                <span className="truncate">Sold Items Report</span>
              </h2>
              <span className="bg-emerald-200 text-emerald-800 text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">
                {getFilteredSoldItems().length} Items
              </span>
            </div>
            
            <div className="flex flex-col gap-2 pt-1 border-t border-emerald-100/50">
              <div className="flex items-center gap-1.5 w-full">
                <span className="text-[10px] md:text-xs font-bold text-emerald-600 uppercase tracking-wider whitespace-nowrap">Filter:</span>
                <select 
                  value={dateFilter} 
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-white border border-emerald-200 text-emerald-700 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 cursor-pointer w-full h-8"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="15days">Last 15 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="60days">Last 60 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="customDays">Custom Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 w-full">
                <span className="text-[10px] md:text-xs font-bold text-emerald-600 uppercase tracking-wider whitespace-nowrap">Distributor:</span>
                <DistributorFilterDropdown distributors={allDistributors} selectedDists={selectedSoldDists} setSelectedDists={setSelectedSoldDists} label="Distributor" />
              </div>
              
              {dateFilter === "customDays" && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] md:text-xs font-bold text-emerald-600 uppercase tracking-wider whitespace-nowrap">Days:</span>
                  <input 
                    type="number"
                    min="1"
                    max="365"
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-white border border-emerald-200 text-emerald-700 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 w-full h-8"
                  />
                </div>
              )}
              
              {dateFilter === "custom" && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">From:</span>
                    <input 
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-white border border-emerald-200 text-emerald-700 rounded-lg px-1.5 py-0.5 text-[10px] font-bold focus:outline-none w-full h-7"
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">To:</span>
                    <input 
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-white border border-emerald-200 text-emerald-700 rounded-lg px-1.5 py-0.5 text-[10px] font-bold focus:outline-none w-full h-7"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 flex-1 flex flex-col justify-between min-h-[280px]">
            {getFilteredSoldItems().length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-xs md:text-sm font-medium m-auto">No sales for this range! 😴</p>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[9px] md:text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="pb-2 font-bold">Item & Details</th>
                      <th className="pb-2 font-bold text-center">Qty</th>
                      <th className="pb-2 font-bold text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {getFilteredSoldItems().slice(0, 5).map((tx, index) => {
                      const txDate = new Date(tx.date);
                      const timeStr = txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                      const dateStr = txDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                      return (
                        <tr key={index} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-2.5 max-w-[140px] md:max-w-[160px]">
                            <p className="font-bold text-slate-700 text-xs md:text-sm leading-tight truncate" title={tx.name}>{tx.name}</p>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <span className="text-[9px] bg-slate-100 text-slate-500 font-semibold px-1 rounded truncate max-w-[80px]" title={`Distributor: ${tx.distributor}`}>
                                {tx.distributor}
                              </span>
                              <span className="text-[9px] bg-slate-100 text-slate-500 font-semibold px-1 rounded">
                                {dateStr}
                              </span>
                              <span className={`text-[9px] font-bold px-1 rounded ${tx.paymentMethod === 'UPI' ? 'bg-indigo-50 text-indigo-600' : tx.paymentMethod === 'Card' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {tx.paymentMethod}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="text-[10px] md:text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg inline-block">
                              {tx.quantity} pcs
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <p className="text-xs md:text-sm font-bold text-slate-800">
                              ₹{tx.total.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[9px] text-slate-400">MRP: ₹{tx.mrp}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {getFilteredSoldItems().length > 5 && (
                  <div className="pt-3 border-t border-slate-50 mt-auto">
                    <button
                      onClick={() => setShowSoldItemsModal(true)}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2 rounded-xl transition-colors w-full"
                    >
                      See All ({getFilteredSoldItems().length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Urgent Expiry Report */}
        <div className="bg-white rounded-[24px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-rose-100 overflow-hidden flex flex-col">
          <div className="bg-rose-50/50 p-4 border-b border-rose-100 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm md:text-base font-bold text-rose-700 flex items-center min-w-0">
                <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" /> 
                <span className="truncate">Expiry Alert</span>
              </h2>
              <span className="bg-rose-200 text-rose-800 text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">
                {getFilteredExpiry().length} Items
              </span>
            </div>
            
            <div className="flex flex-col gap-2 pt-1 border-t border-rose-100/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] md:text-xs font-bold text-rose-600 uppercase tracking-wider">In:</span>
                  <select 
                    value={expiryMonths} 
                    onChange={(e) => setExpiryMonths(Number(e.target.value))}
                    className="bg-white border border-rose-200 text-rose-700 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 cursor-pointer min-w-[80px] h-8"
                  >
                    <option value={1}>1 Month</option>
                    <option value={2}>2 Months</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={9}>9 Months</option>
                    <option value={12}>12 Months</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <DistributorFilterDropdown distributors={allDistributors} selectedDists={selectedExpiryDists} setSelectedDists={setSelectedExpiryDists} label="Distributor" />
                  
                  <button
                    onClick={handleDownloadPDF}
                    disabled={getFilteredExpiry().length === 0}
                    className="bg-slate-800 hover:bg-slate-900 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold px-2.5 py-1 h-8 rounded-lg flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                    title="Download Expiry Report as PDF"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 flex-1 flex flex-col justify-between min-h-[280px]">
            {getFilteredExpiry().length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-xs md:text-sm font-medium m-auto">No medicines are expiring soon! 🎉</p>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[9px] md:text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="pb-2 font-bold">Medicine</th>
                      <th className="pb-2 font-bold text-right">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {getFilteredExpiry().slice(0, 5).map((med) => (
                      <tr key={med._id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-2 max-w-[120px]">
                          <p className="font-bold text-slate-700 text-xs md:text-sm leading-tight truncate" title={med.name}>{med.name}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Qty: <span className="font-bold text-rose-500">{med.quantity}</span> | {med.batch}</p>
                        </td>
                        <td className="py-2 text-right">
                          <div className="inline-flex items-center text-[10px] md:text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                            {formatExpiryDate(med.expiryDate)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {getFilteredExpiry().length > 5 && (
                  <div className="pt-3 border-t border-slate-50 mt-auto">
                    <button
                      onClick={() => setShowExpiryModal(true)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 py-2 rounded-xl transition-colors w-full"
                    >
                      See All ({getFilteredExpiry().length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Low Stock Report */}
        <div className="bg-white rounded-[24px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-amber-100 overflow-hidden flex flex-col mt-4 md:mt-0 lg:mt-0">
          <div className="bg-amber-50/50 p-4 border-b border-amber-100 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm md:text-base font-bold text-amber-700 flex items-center min-w-0">
                <TrendingDown className="w-4 h-4 mr-1.5 shrink-0" /> 
                <span className="truncate">Low Stock Alert</span>
              </h2>
              <span className="bg-amber-200 text-amber-800 text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">
                {getFilteredLowStock().length} Items
              </span>
            </div>
            
            <div className="flex flex-col gap-2 pt-1 border-t border-amber-100/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-[10px] md:text-xs font-bold text-amber-600 uppercase tracking-wider whitespace-nowrap">Qty &lt;:</span>
                  <input 
                    type="number"
                    min="1"
                    max="1000"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 10))}
                    className="bg-white border border-amber-200 text-amber-700 rounded-lg px-2 py-1 w-full text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 h-8"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <DistributorFilterDropdown distributors={allDistributors} selectedDists={selectedLowStockDists} setSelectedDists={setSelectedLowStockDists} label="Distributor" />
                  
                  <button
                    onClick={handleDownloadLowStockPDF}
                    disabled={getFilteredLowStock().length === 0}
                    className="bg-slate-800 hover:bg-slate-900 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold px-2.5 py-1 h-8 rounded-lg flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                    title="Download Low Stock Report as PDF"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 flex-1 flex flex-col justify-between min-h-[280px]">
            {getFilteredLowStock().length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-xs md:text-sm font-medium m-auto">All stock levels are optimal! 📦</p>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[9px] md:text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="pb-2 font-bold">Medicine</th>
                      <th className="pb-2 font-bold text-right">Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {getFilteredLowStock().slice(0, 5).map((med) => (
                      <tr key={med._id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-2 max-w-[120px]">
                          <p className="font-bold text-slate-700 text-xs md:text-sm leading-tight truncate" title={med.name}>{med.name}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Dist: {med.distributor}</p>
                        </td>
                        <td className="py-2 text-right">
                          <span className="text-xs md:text-sm font-extrabold text-amber-500 bg-amber-50 px-2 py-1 rounded-xl inline-block">
                            {med.quantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {getFilteredLowStock().length > 5 && (
                  <div className="pt-3 border-t border-slate-50 mt-auto">
                    <button
                      onClick={() => setShowLowStockModal(true)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 py-2 rounded-xl transition-colors w-full"
                    >
                      See All ({getFilteredLowStock().length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Items Sold Details */}
      {showSoldItemsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] md:rounded-3xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center">
                <Package className="w-5 h-5 mr-2 text-indigo-500" />
                Sold Items Report ({getSelectedDateLabel()})
              </h2>
              <button 
                onClick={() => setShowSoldItemsModal(false)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors bg-white border border-slate-200 shadow-sm"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-50/30">
              {getFilteredSoldItems().length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Package className="w-10 h-10 mb-3 text-slate-300" />
                  <p className="text-sm md:text-base font-medium">No sales recorded for this range. 😴</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] md:text-xs text-slate-500 uppercase tracking-wider border-b border-slate-150">
                      <th className="p-3 md:p-4 font-bold">#</th>
                      <th className="p-3 md:p-4 font-bold">Receipt</th>
                      <th className="p-3 md:p-4 font-bold">Medicine</th>
                      <th className="p-3 md:p-4 font-bold">Distributor</th>
                      <th className="p-3 md:p-4 font-bold text-center">Qty</th>
                      <th className="p-3 md:p-4 font-bold text-center">MRP</th>
                      <th className="p-3 md:p-4 font-bold text-center">Pay Mode</th>
                      <th className="p-3 md:p-4 font-bold text-right">Total Price</th>
                      <th className="p-3 md:p-4 font-bold text-right">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                    {getFilteredSoldItems().map((tx, index) => {
                      const txDate = new Date(tx.date);
                      const timeStr = txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                      const dateStr = txDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                      return (
                        <tr key={index} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="p-3 md:p-4 text-slate-400">{index + 1}</td>
                          <td className="p-3 md:p-4 font-medium text-slate-500">#{tx.billNumber}</td>
                          <td className="p-3 md:p-4">
                            <p className="font-bold text-slate-800">{tx.name}</p>
                          </td>
                          <td className="p-3 md:p-4 font-semibold text-slate-600">{tx.distributor || 'N/A'}</td>
                          <td className="p-3 md:p-4 text-center">
                            <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                              {tx.quantity} pcs
                            </span>
                          </td>
                          <td className="p-3 md:p-4 text-center font-medium text-slate-600">₹{tx.mrp}</td>
                          <td className="p-3 md:p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.paymentMethod === 'UPI' ? 'bg-indigo-50 text-indigo-600' : tx.paymentMethod === 'Card' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {tx.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3 md:p-4 text-right font-extrabold text-slate-700">₹{tx.total.toLocaleString('en-IN')}</td>
                          <td className="p-3 md:p-4 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-700 block">{dateStr}</span>
                            <span className="text-[11px] text-slate-400 font-semibold">{timeStr}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Expiry Alert Full Details */}
      {showExpiryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] md:rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg md:text-xl font-bold text-rose-800 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-rose-500" />
                Medicines Expiring Within {expiryMonths} Month{expiryMonths > 1 ? 's' : ''}
              </h2>
              <div className="flex items-center gap-3">
                {getFilteredExpiry().length > 0 && (
                  <button
                    onClick={handleDownloadPDF}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                  >
                    <Printer className="w-4 h-4" /> Download PDF
                  </button>
                )}
                <button 
                  onClick={() => setShowExpiryModal(false)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors bg-white border border-slate-200 shadow-sm"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-50/30">
              <table className="w-full text-left border-collapse bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] md:text-xs text-slate-500 uppercase tracking-wider border-b border-slate-150">
                    <th className="p-3 md:p-4 font-bold">#</th>
                    <th className="p-3 md:p-4 font-bold">Medicine</th>
                    <th className="p-3 md:p-4 font-bold">Location</th>
                    <th className="p-3 md:p-4 font-bold">Bill No.</th>
                    <th className="p-3 md:p-4 font-bold text-center">Stock Qty</th>
                    <th className="p-3 md:p-4 font-bold text-right">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                  {getFilteredExpiry().map((med, index) => (
                    <tr key={med._id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="p-3 md:p-4 text-slate-400">{index + 1}</td>
                      <td className="p-3 md:p-4">
                        <p className="font-bold text-slate-800">{med.name}</p>
                        <p className="text-[10px] text-slate-400">Distributor: {med.distributor || 'N/A'}</p>
                      </td>
                      <td className="p-3 md:p-4 font-medium text-slate-600">{med.batch || 'N/A'}</td>
                      <td className="p-3 md:p-4 font-medium text-slate-600">{med.billNumber || 'N/A'}</td>
                      <td className="p-3 md:p-4 text-center">
                        <span className="font-extrabold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg">
                          {med.quantity}
                        </span>
                      </td>
                      <td className="p-3 md:p-4 text-right">
                        <span className="font-bold text-rose-600">
                          {formatExpiryDate(med.expiryDate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Low Stock Alert Full Details */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] md:rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center">
                <TrendingDown className="w-5 h-5 mr-2 text-amber-500" />
                Low Stock Alerts (Qty &lt; {lowStockThreshold})
              </h2>
              <div className="flex items-center gap-3">
                {getFilteredLowStock().length > 0 && (
                  <button
                    onClick={handleDownloadLowStockPDF}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                  >
                    <Printer className="w-4 h-4" /> Download PDF
                  </button>
                )}
                <button 
                  onClick={() => setShowLowStockModal(false)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors bg-white border border-slate-200 shadow-sm"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-50/30">
              <table className="w-full text-left border-collapse bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] md:text-xs text-slate-500 uppercase tracking-wider border-b border-slate-150">
                    <th className="p-3 md:p-4 font-bold">#</th>
                    <th className="p-3 md:p-4 font-bold">Medicine</th>
                    <th className="p-3 md:p-4 font-bold">Distributor</th>
                    <th className="p-3 md:p-4 font-bold">Location</th>
                    <th className="p-3 md:p-4 font-bold text-right">Available Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                  {getFilteredLowStock().map((med, index) => (
                    <tr key={med._id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="p-3 md:p-4 text-slate-400">{index + 1}</td>
                      <td className="p-3 md:p-4">
                        <p className="font-bold text-slate-800">{med.name}</p>
                      </td>
                      <td className="p-3 md:p-4 font-medium text-slate-600">{med.distributor || 'N/A'}</td>
                      <td className="p-3 md:p-4 font-medium text-slate-600">{med.batch || 'N/A'}</td>
                      <td className="p-3 md:p-4 text-right">
                        <span className="font-extrabold text-amber-500 bg-amber-50 px-2.5 py-1 rounded-lg">
                          {med.quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: View All Distributors */}
      {showAllDistributors && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] md:rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center">
                <Truck className="w-5 h-5 mr-2 text-indigo-500" />
                Distributor Performance Board
              </h2>
              <button 
                onClick={() => setShowAllDistributors(false)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors bg-white border border-slate-200 shadow-sm"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search distributor by name..."
                  value={distributorSearch}
                  onChange={(e) => setDistributorSearch(e.target.value)}
                  className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700"
                />
              </div>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-50/30">
              {filteredDistributors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Search className="w-10 h-10 mb-3 text-slate-300" />
                  <p className="text-sm md:text-base font-medium">No distributors found matching &quot;{distributorSearch}&quot;</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDistributors.map((dist, index) => (
                    <div key={dist._id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-all relative">
                      {index === 0 && (dist?.revenueGenerated || 0) > 0 && distributorSearch === "" && (
                        <div className="absolute -top-3 -right-2 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md z-10 flex items-center">
                          <Award className="w-3 h-3 mr-0.5" /> #1 Earner
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3 truncate">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${index === 0 ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}>
                            <Truck className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-slate-700 text-sm truncate" title={dist._id}>{dist._id}</span>
                        </div>
                      </div>
                      <div className="space-y-2 mt-auto">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 flex items-center"><ShoppingCart className="w-3 h-3 mr-1 text-slate-400"/> Sold Units</span>
                          <span className="font-bold text-slate-700">{dist?.soldQuantity || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 flex items-center"><PackageOpen className="w-3 h-3 mr-1 text-slate-400"/> Left Stock</span>
                          <span className="font-bold text-slate-700">{dist?.totalQuantity || 0}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center mt-1">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue</span>
                          <span className="text-sm font-extrabold text-emerald-600 flex items-center">
                            <IndianRupee className="w-3 h-3 mr-0.5" />
                            {(dist?.revenueGenerated || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden printable container for B&W PDF Expiry Report */}
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
        <div ref={printRef} className="p-8 bg-white text-black font-sans w-[210mm]">
          <style type="text/css" media="print">
            {`
              @page {
                size: A4;
                margin: 20mm 15mm 20mm 15mm;
              }
              body {
                color: #000 !important;
                background: #fff !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              }
              .print-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              .print-table th {
                border-bottom: 2px solid #000;
                padding: 10px 8px;
                font-size: 11px;
                font-weight: bold;
                text-transform: uppercase;
                text-align: left;
              }
              .print-table td {
                border-bottom: 1px solid #ddd;
                padding: 10px 8px;
                font-size: 11px;
                color: #000;
              }
              .print-header {
                border-bottom: 3px solid #000;
                padding-bottom: 15px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
              }
              .print-title {
                font-size: 22px;
                font-weight: 800;
                letter-spacing: -0.5px;
                text-transform: uppercase;
                margin: 0;
              }
              .print-subtitle {
                font-size: 11px;
                color: #555;
                margin-top: 4px;
                font-weight: 500;
              }
              .print-meta {
                font-size: 10px;
                color: #333;
                text-align: right;
                font-weight: 500;
                line-height: 1.4;
              }
              .print-summary-box {
                background-color: #f8fafc;
                border: 1px solid #000;
                padding: 12px;
                display: flex;
                justify-content: space-between;
                margin-top: 15px;
                font-size: 11px;
                font-weight: bold;
              }
            `}
          </style>
          
          {/* Header */}
          <div className="print-header">
            <div>
              <h1 className="print-title">Medicines Expiry Report</h1>
              <p className="print-subtitle">Smart Inventory & Loss Prevention insights</p>
            </div>
            <div className="print-meta">
              <p>Generated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <p>Filter: Expiring in {expiryMonths} Month{expiryMonths > 1 ? 's' : ''}</p>
              <p>Distributors: {selectedExpiryDists.length === 0 ? "All" : selectedExpiryDists.join(", ")}</p>
            </div>
          </div>

          {/* Quick Summary Banner */}
          <div className="print-summary-box">
            <span>TOTAL EXPIRING PRODUCTS: {getFilteredExpiry().length}</span>
            <span>STATUS: URGENT / ATTENTION REQUIRED</span>
          </div>

          {/* Data Table */}
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '6%' }}>#</th>
                <th style={{ width: '40%' }}>Medicine Name</th>
                <th style={{ width: '15%' }}>Location</th>
                <th style={{ width: '15%' }}>Bill Number</th>
                <th style={{ width: '12%', textAlign: 'center' }}>Stock Qty</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Expiry Date</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredExpiry().map((med, idx) => (
                <tr key={med._id}>
                  <td>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{med.name}</div>
                    <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>Dist: {med.distributor || 'N/A'}</div>
                  </td>
                  <td>{med.batch || 'N/A'}</td>
                  <td>{med.billNumber || 'N/A'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{med.quantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatExpiryDate(med.expiryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden printable container for B&W PDF Low Stock Report */}
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
        <div ref={lowStockPrintRef} className="p-8 bg-white text-black font-sans w-[210mm]">
          <style type="text/css" media="print">
            {`
              @page {
                size: A4;
                margin: 20mm 15mm 20mm 15mm;
              }
              body {
                color: #000 !important;
                background: #fff !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              }
              .print-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              .print-table th {
                border-bottom: 2px solid #000;
                padding: 10px 8px;
                font-size: 11px;
                font-weight: bold;
                text-transform: uppercase;
                text-align: left;
              }
              .print-table td {
                border-bottom: 1px solid #ddd;
                padding: 10px 8px;
                font-size: 11px;
                color: #000;
              }
              .print-header {
                border-bottom: 3px solid #000;
                padding-bottom: 15px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
              }
              .print-title {
                font-size: 22px;
                font-weight: 800;
                letter-spacing: -0.5px;
                text-transform: uppercase;
                margin: 0;
              }
              .print-subtitle {
                font-size: 11px;
                color: #555;
                margin-top: 4px;
                font-weight: 500;
              }
              .print-meta {
                font-size: 10px;
                color: #333;
                text-align: right;
                font-weight: 500;
                line-height: 1.4;
              }
              .print-summary-box {
                background-color: #f8fafc;
                border: 1px solid #000;
                padding: 12px;
                display: flex;
                justify-content: space-between;
                margin-top: 15px;
                font-size: 11px;
                font-weight: bold;
              }
            `}
          </style>
          
          <div className="print-header">
            <div>
              <h1 className="print-title">Low Stock Report</h1>
              <p className="print-subtitle">Smart Inventory replenishment alerts</p>
            </div>
            <div className="print-meta">
              <p>Generated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <p>Filter: Stock Quantity &lt; {lowStockThreshold}</p>
              <p>Distributors: {selectedLowStockDists.length === 0 ? "All" : selectedLowStockDists.join(", ")}</p>
            </div>
          </div>

          <div className="print-summary-box">
            <span>TOTAL LOW STOCK PRODUCTS: {getFilteredLowStock().length}</span>
            <span>STATUS: REORDER RECOMMENDATION</span>
          </div>

          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '6%' }}>#</th>
                <th style={{ width: '40%' }}>Medicine Name</th>
                <th style={{ width: '20%' }}>Distributor</th>
                <th style={{ width: '18%' }}>Location</th>
                <th style={{ width: '16%', textAlign: 'right' }}>Available Qty</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredLowStock().map((med, idx) => (
                <tr key={med._id}>
                  <td>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{med.name}</div>
                  </td>
                  <td>{med.distributor || 'N/A'}</td>
                  <td>{med.batch || 'N/A'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{med.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}