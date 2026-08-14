"use client";
import { useState, useEffect } from "react";
import { History, Search, Calendar, MapPin, User, Tag, ShoppingBag, Loader2, AlertCircle, CheckCircle, PackageOpen } from "lucide-react";
import { formatDate, formatExpiryDate } from "@/lib/formatDate";
import toast, { Toaster } from "react-hot-toast";

export default function MedicineHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMed, setSelectedMed] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Debounced search for all medicines (including empty/expired stock)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/medicine?search=${encodeURIComponent(searchQuery)}&includeEmpty=true&limit=15`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.medicines);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectMedicine = async (med) => {
    setSelectedMed(med);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/medicine/history?medicineId=${med._id}`);
      const data = await res.json();
      if (data.success) {
        setSalesHistory(data.transactions);
      } else {
        toast.error(data.error || "Failed to load audit history log.");
      }
    } catch (err) {
      toast.error("Error loading details from server.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const isExpired = (expiryDateString) => {
    return new Date(expiryDateString) <= new Date();
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header */}
      <div className="flex items-center">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center mr-3 md:mr-4 border border-emerald-100 shrink-0">
          <History className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">Medicine Audit & Sales History</h1>
          <p className="text-slate-500 text-[10px] md:text-sm font-medium mt-0.5">Search any medicine (expired or sold out) to view detailed purchase and sale transaction history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Search & Filter Medicines */}
        <div className="lg:col-span-1 bg-white p-5 rounded-[24px] border border-slate-200 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col max-h-[75vh]">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Search Medicine Directory</h2>
          
          <div className="relative mb-4">
            <input 
              type="text" 
              placeholder="Search name, barcode, location..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm font-semibold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 p-1 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            {searchLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
                <span className="text-xs font-semibold">Searching Directory...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <PackageOpen className="w-10 h-10 mx-auto mb-2 opacity-25" />
                <p className="text-xs font-bold">{searchQuery ? "No matching medicine found." : "Type above to search..."}</p>
              </div>
            ) : (
              searchResults.map((med) => {
                const expired = isExpired(med.expiryDate);
                const soldOut = med.quantity <= 0;

                return (
                  <div 
                    key={med._id} 
                    onClick={() => handleSelectMedicine(med)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedMed?._id === med._id 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-white border-slate-200 hover:border-emerald-100 hover:bg-slate-50/50'
                    }`}
                  >
                    <p className="font-bold text-xs md:text-sm text-slate-800 truncate leading-snug">{med.name}</p>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {soldOut ? (
                        <span className="text-[8px] font-bold bg-rose-50 border border-rose-100 text-rose-600 px-1.5 py-0.5 rounded shadow-sm">Sold Out</span>
                      ) : (
                        <span className="text-[8px] font-bold bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded shadow-sm">Stock: {med.quantity}</span>
                      )}

                      {expired ? (
                        <span className="text-[8px] font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded shadow-sm">Expired</span>
                      ) : (
                        <span className="text-[8px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shadow-sm">Active</span>
                      )}

                      <span className="text-[8px] font-bold bg-slate-50 border border-slate-100 text-slate-500 px-1.5 py-0.5 rounded">₹{med.mrp}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed logs */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedMed ? (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-[24px] p-12 text-center text-slate-400 min-h-[400px] flex flex-col items-center justify-center">
              <History className="w-12 h-12 mb-3 opacity-20" />
              <h3 className="font-bold text-slate-600 text-sm md:text-base">No Medicine Selected</h3>
              <p className="text-xs mt-1">Select a medicine from the left sidebar to view its purchase invoice and sales transaction records.</p>
            </div>
          ) : detailsLoading ? (
            <div className="bg-white rounded-[24px] border border-slate-200 p-12 text-center text-slate-400 min-h-[400px] flex flex-col items-center justify-center shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)]">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
              <p className="font-semibold text-sm">Loading transaction details...</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Medicine Purchase Card info */}
              <div className="bg-white p-5 md:p-6 rounded-[24px] border border-slate-200 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-800 leading-tight">{selectedMed.name}</h3>
                    <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Barcode: {selectedMed.barcodeId}</p>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {selectedMed.quantity <= 0 && (
                      <span className="text-[10px] font-bold bg-rose-50 border border-rose-100 text-rose-600 px-2.5 py-1 rounded-full">Sold Out</span>
                    )}
                    {isExpired(selectedMed.expiryDate) ? (
                      <span className="text-[10px] font-bold bg-rose-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Expired</span>
                    ) : (
                      <span className="text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Active in Stock</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> Location / Batch</span>
                    <span className="text-slate-700 font-extrabold text-sm">{selectedMed.batch}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> Distributor</span>
                    <span className="text-slate-700 font-extrabold text-sm truncate max-w-[120px] block">{selectedMed.distributor}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" /> Purchase Info</span>
                    <span className="text-slate-700 font-extrabold text-[11px] block leading-snug">
                      Bill: {selectedMed.billNumber}<br />
                      Date: {formatDate(selectedMed.purchaseDate)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider flex items-center gap-1"><Tag className="w-3 h-3 text-slate-400" /> Price (MRP)</span>
                    <span className="text-emerald-600 font-extrabold text-sm">₹{selectedMed.mrp}</span>
                  </div>
                </div>
              </div>

              {/* Medicine Sales Transaction Table log */}
              <div className="bg-white p-5 md:p-6 rounded-[24px] border border-slate-200 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)]">
                <h3 className="text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-500" /> Sales Transaction Log
                </h3>

                {salesHistory.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-25" />
                    <p className="text-xs font-semibold">No sales logged yet for this medicine.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[10px]">
                        <tr>
                          <th className="p-3">Sale Date & Time</th>
                          <th className="p-3">Sale Invoice ID</th>
                          <th className="p-3">Qty Sold</th>
                          <th className="p-3">MRP</th>
                          <th className="p-3">Payment</th>
                          <th className="p-3 text-right">Total Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {salesHistory.map((txn, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="p-3 whitespace-nowrap">{formatDateTime(txn.date)}</td>
                            <td className="p-3 truncate max-w-[100px] text-slate-500" title={txn.saleId}>{txn.saleId}</td>
                            <td className="p-3 font-bold text-slate-800">{txn.quantity} units</td>
                            <td className="p-3 text-slate-400">₹{txn.mrp}</td>
                            <td className="p-3">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                txn.paymentMethod === 'UPI' ? 'bg-indigo-50 border border-indigo-100 text-indigo-600' :
                                txn.paymentMethod === 'Card' ? 'bg-amber-50 border border-amber-100 text-amber-600' :
                                'bg-slate-100 border border-slate-200 text-slate-600'
                              }`}>
                                {txn.paymentMethod}
                              </span>
                            </td>
                            <td className="p-3 text-right font-extrabold text-emerald-600">₹{txn.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
