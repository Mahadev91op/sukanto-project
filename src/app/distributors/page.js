"use client";
import { useState, useEffect } from "react";
import { 
  Truck, Plus, Trash2, Loader2, ChevronDown, ChevronUp, 
  Package, AlertCircle, Search, Mail, Phone, MapPin, Award, 
  UserCheck, X, Check, ArrowLeft, ArrowRight, IndianRupee 
} from "lucide-react";
import { formatDate, formatExpiryDate } from "@/lib/formatDate";
import toast, { Toaster } from "react-hot-toast";

export default function DistributorsPage() {
  // Distributors list & pagination states
  const [distributors, setDistributors] = useState([]);
  const [distPagination, setDistPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentDistPage, setCurrentDistPage] = useState(1);
  const [distSearch, setDistSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Expanded distributor medicine stats and pagination
  const [expandedDistId, setExpandedDistId] = useState(null);
  const [expandedDistName, setExpandedDistName] = useState("");
  const [expandedMeds, setExpandedMeds] = useState([]);
  const [expandedStats, setExpandedStats] = useState({ totalTypes: 0, totalQty: 0, totalValue: 0 });
  const [expandedPagination, setExpandedPagination] = useState({ page: 1, totalPages: 1 });
  const [medsLoading, setMedsLoading] = useState(false);
  const [currentMedPage, setCurrentMedPage] = useState(1);

  // New Distributor form states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    contactPerson: ""
  });
  const [adding, setAdding] = useState(false);

  // Confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch Distributors List (Server-side paginated and searched)
  const fetchDistributors = async (page = 1, search = "", syncLegacy = false) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        search: search
      });
      if (syncLegacy) {
        queryParams.append("sync", "true");
      }
      const res = await fetch(`/api/distributors?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDistributors(data.distributors);
        setDistPagination(data.pagination);
      } else {
        toast.error("Failed to load distributors.");
      }
    } catch (err) {
      toast.error("Failed to communicate with distributors API.");
    } finally {
      setLoading(false);
    }
  };

  // Sync legacy and load initial data on mount
  useEffect(() => {
    fetchDistributors(1, "", true);
  }, []);

  // Debounced search for distributors list
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setCurrentDistPage(1);
      fetchDistributors(1, distSearch);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [distSearch]);

  const handleDistPageChange = (newPage) => {
    if (newPage < 1 || newPage > distPagination.totalPages) return;
    setCurrentDistPage(newPage);
    fetchDistributors(newPage, distSearch);
    setExpandedDistId(null); // Collapse any open accordions on page change
  };

  // Fetch paginated medicines for expanded distributor
  const fetchDistributorMedicines = async (distName, page = 1) => {
    setMedsLoading(true);
    try {
      const res = await fetch(`/api/distributors/medicines?distributorName=${encodeURIComponent(distName)}&page=${page}&limit=8`);
      const data = await res.json();
      if (data.success) {
        setExpandedMeds(data.medicines);
        setExpandedStats(data.stats);
        setExpandedPagination(data.pagination);
      } else {
        toast.error("Failed to load distributor inventory report.");
      }
    } catch (err) {
      toast.error("Error communicating with inventory API.");
    } finally {
      setMedsLoading(false);
    }
  };

  const handleMedPageChange = (newPage) => {
    if (newPage < 1 || newPage > expandedPagination.totalPages) return;
    setCurrentMedPage(newPage);
    fetchDistributorMedicines(expandedDistName, newPage);
  };

  const toggleExpandDistributor = (dist) => {
    if (expandedDistId === dist._id) {
      setExpandedDistId(null);
      setExpandedDistName("");
      setExpandedMeds([]);
    } else {
      setExpandedDistId(dist._id);
      setExpandedDistName(dist.name);
      setCurrentMedPage(1);
      fetchDistributorMedicines(dist.name, 1);
    }
  };

  // Open confirmation overlay
  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Distributor name is required!");
      return;
    }
    setShowConfirmModal(true);
  };

  // Execute actual creation after confirmation
  const handleConfirmAdd = async () => {
    setShowConfirmModal(false);
    setAdding(true);
    try {
      const res = await fetch("/api/distributors", {
        method: "POST",
        body: JSON.stringify(formData),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Distributor "${data.distributor.name}" added successfully!`);
        setFormData({
          name: "",
          phone: "",
          email: "",
          address: "",
          gstin: "",
          contactPerson: ""
        });
        fetchDistributors(currentDistPage, distSearch);
      } else {
        toast.error(data.error || "Failed to add distributor");
      }
    } catch (err) {
      toast.error("Network error occurred.");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteDistributor = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the distributor list?`)) return;

    try {
      const res = await fetch(`/api/distributors?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Deleted successfully!");
        // Refresh current page
        fetchDistributors(currentDistPage, distSearch);
        if (expandedDistId === id) {
          setExpandedDistId(null);
        }
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch (err) {
      toast.error("Network error occurred.");
    }
  };

  const isNearExpiry = (expiryDateString) => {
    const expDate = new Date(expiryDateString);
    const today = new Date();
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header */}
      <div className="flex items-center">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center mr-3 md:mr-4 border border-emerald-100 shrink-0">
          <Truck className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">Distributor Management</h1>
          <p className="text-slate-500 text-[10px] md:text-sm font-medium mt-0.5">Register detailed agencies and view dynamic paginated inventory records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Register Form (Detailed Details) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-[24px] border border-slate-200 shadow-[0_4px_20px_-3px_rgba(0,0,0,0.05)] h-fit">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Register Distributor</h2>
          
          <form onSubmit={handlePreSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Agency Name <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Cipla Healthcare Ltd"
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm font-semibold"
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Person (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Mr. Rajesh Kumar"
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm font-semibold"
                value={formData.contactPerson} 
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. +91 99999..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-xs font-bold"
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">GSTIN (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 07AAAAA..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-xs font-bold"
                  value={formData.gstin} 
                  onChange={(e) => setFormData({...formData, gstin: e.target.value})} 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email (Optional)</label>
              <input 
                type="email" 
                placeholder="e.g. info@cipla.com"
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm font-semibold"
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address (Optional)</label>
              <textarea 
                placeholder="Enter office / shop address..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm font-semibold resize-none"
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})} 
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs md:text-sm px-4 py-3 rounded-xl transition-all shadow-md flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Register Distributor
            </button>
          </form>
        </div>

        {/* Right Side: List & Accordion report views */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Distributors & Stock Reports</h2>
            
            {/* Search Box */}
            <div className="relative w-full sm:max-w-xs">
              <input 
                type="text" 
                placeholder="Search distributors list..."
                className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-xs font-bold shadow-sm"
                value={distSearch}
                onChange={(e) => setDistSearch(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            </div>
          </div>

          {loading ? (
            <div className="bg-white p-12 text-center rounded-[24px] border border-slate-200 flex flex-col items-center justify-center shadow-[0_4px_20px_-3px_rgba(0,0,0,0.05)] min-h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
              <p className="text-xs font-semibold text-slate-400">Loading directory list...</p>
            </div>
          ) : distributors.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-[24px] border border-slate-200 text-slate-400 shadow-[0_4px_20px_-3px_rgba(0,0,0,0.05)]">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-sm">No matching distributors found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {distributors.map((dist) => {
                const isExpanded = expandedDistId === dist._id;

                return (
                  <div 
                    key={dist._id} 
                    className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300"
                  >
                    {/* Collapsible Accordion Header */}
                    <div 
                      onClick={() => toggleExpandDistributor(dist)}
                      className="p-4 flex items-start justify-between hover:bg-slate-50/50 cursor-pointer select-none transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <h3 className="font-bold text-slate-800 text-sm md:text-base truncate leading-snug">{dist.name}</h3>
                        </div>
                        
                        {/* Summary details */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1.5 gap-x-4 text-[10px] md:text-xs text-slate-500 font-semibold">
                          {dist.contactPerson && (
                            <span className="truncate flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {dist.contactPerson}</span>
                          )}
                          {dist.phone && (
                            <span className="truncate flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {dist.phone}</span>
                          )}
                          {dist.gstin && (
                            <span className="truncate flex items-center gap-1"><Award className="w-3.5 h-3.5 text-slate-400 shrink-0" /> GST: {dist.gstin}</span>
                          )}
                          {dist.email && (
                            <span className="truncate flex items-center gap-1 sm:col-span-2"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {dist.email}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDistributor(dist._id, dist.name);
                          }}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>

                    {/* Collapsible Accordion Body - Paginated Medicine List from Server */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50/50 p-4 md:p-6 animate-in slide-in-from-top duration-300 space-y-4">
                        
                        {/* Reports Stat banner */}
                        <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200 text-center">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Medicines</span>
                            <p className="text-sm font-extrabold text-slate-700">{expandedStats.totalTypes}</p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">In-Stock</span>
                            <p className="text-sm font-extrabold text-slate-700">{expandedStats.totalQty} units</p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Value</span>
                            <p className="text-sm font-extrabold text-emerald-600">₹{expandedStats.totalValue.toLocaleString()}</p>
                          </div>
                        </div>

                        {medsLoading ? (
                          <div className="flex items-center justify-center py-10 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
                            <span className="text-xs font-semibold">Loading stock records...</span>
                          </div>
                        ) : expandedMeds.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                            <Package className="w-8 h-8 opacity-25 mb-1.5" />
                            <p className="text-xs font-semibold">No active inventory in stock from this distributor.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[10px]">
                                  <tr>
                                    <th className="p-3">Medicine Name</th>
                                    <th className="p-3">Location</th>
                                    <th className="p-3">Qty</th>
                                    <th className="p-3">MRP</th>
                                    <th className="p-3">Expiry Date</th>
                                    <th className="p-3 text-right">Value (₹)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                  {expandedMeds.map((med) => {
                                    const nearExpiry = isNearExpiry(med.expiryDate);
                                    return (
                                      <tr key={med._id} className="hover:bg-slate-50/50">
                                        <td className="p-3 truncate max-w-[150px] font-bold text-slate-800">{med.name}</td>
                                        <td className="p-3">{med.batch}</td>
                                        <td className="p-3">{med.quantity}</td>
                                        <td className="p-3 text-slate-500">₹{med.mrp}</td>
                                        <td className="p-3">
                                          <div className="flex items-center gap-1">
                                            <span className={nearExpiry ? "text-amber-600 font-extrabold" : ""}>
                                              {formatExpiryDate(med.expiryDate)}
                                            </span>
                                            {nearExpiry && <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                          </div>
                                        </td>
                                        <td className="p-3 text-right text-slate-900 font-bold">₹{((med.mrp || 0) * (med.quantity || 0)).toLocaleString()}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Accordion inner dynamic medicine pagination */}
                            {expandedPagination.totalPages > 1 && (
                              <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500">
                                <button
                                  type="button"
                                  onClick={() => handleMedPageChange(currentMedPage - 1)}
                                  disabled={currentMedPage === 1}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" /> Prev
                                </button>
                                
                                <span>Page {currentMedPage} of {expandedPagination.totalPages}</span>
                                
                                <button
                                  type="button"
                                  onClick={() => handleMedPageChange(currentMedPage + 1)}
                                  disabled={currentMedPage === expandedPagination.totalPages}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
                                >
                                  Next <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Distributors Grid pagination */}
              {distPagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white p-4 rounded-[20px] border border-slate-200 text-xs md:text-sm font-bold text-slate-500 shadow-sm mt-4">
                  <button
                    type="button"
                    onClick={() => handleDistPageChange(currentDistPage - 1)}
                    disabled={currentDistPage === 1}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-50 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all disabled:opacity-40"
                  >
                    <ArrowLeft className="w-4 h-4" /> Previous
                  </button>
                  
                  <span>Showing page {currentDistPage} of {distPagination.totalPages} ({distPagination.total} Total)</span>
                  
                  <button
                    type="button"
                    onClick={() => handleDistPageChange(currentDistPage + 1)}
                    disabled={currentDistPage === distPagination.totalPages}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-50 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all disabled:opacity-40"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Confirmation React Modal Overlay */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-250">
            <div className="bg-slate-800 p-5 flex justify-between items-center text-white">
              <div className="flex items-center">
                <Truck className="w-5 h-5 mr-2 text-emerald-400" />
                <h3 className="text-base font-bold">Confirm Registration</h3>
              </div>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 flex-1 space-y-4 text-xs font-bold text-slate-600">
              <p className="text-slate-500 font-medium text-center text-xs mb-2">Are you sure you want to register this distributor with the following details?</p>
              
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3.5 shadow-inner">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">Agency Name:</span>
                  <span className="text-slate-800 text-right">{formData.name}</span>
                </div>
                
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">Contact Person:</span>
                  <span className="text-slate-700 text-right">{formData.contactPerson || "Not Entered"}</span>
                </div>

                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">Phone:</span>
                  <span className="text-slate-700 text-right">{formData.phone || "Not Entered"}</span>
                </div>

                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">GSTIN:</span>
                  <span className="text-slate-700 text-right">{formData.gstin || "Not Entered"}</span>
                </div>

                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">Email:</span>
                  <span className="text-slate-700 text-right truncate max-w-[200px]">{formData.email || "Not Entered"}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 font-medium">Address:</span>
                  <span className="text-slate-700 font-semibold leading-relaxed">{formData.address || "Not Entered"}</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-white border-t border-slate-200 flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all text-xs"
              >
                Cancel
              </button>
              
              <button 
                onClick={handleConfirmAdd}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-1 text-xs"
              >
                <Check className="w-4 h-4" /> Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
