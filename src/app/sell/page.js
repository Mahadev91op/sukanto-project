"use client";
import { useState, useRef, useEffect } from "react";
import { ScanBarcode, ShoppingCart, Trash2, CheckCircle, Loader2, Camera, IndianRupee, Search } from "lucide-react";
import { formatDate, formatExpiryDate } from "@/lib/formatDate";
import CameraScanner from "@/components/sell/CameraScanner"; 
import toast, { Toaster } from "react-hot-toast";

export default function QuickSell() {
  const [barcode, setBarcode] = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState("Cash"); 
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef(null);

  // Advanced quantity & autocomplete suggestions states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (!showCamera) {
      inputRef.current?.focus();
    }
  }, [showCamera]);

  // Click outside suggestions container to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search suggestions as typing
  useEffect(() => {
    if (!manualSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/medicine?search=${encodeURIComponent(manualSearch)}&limit=10`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.medicines);
        }
      } catch (error) {
        console.error("Manual search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [manualSearch]);

  const processBarcode = async (scannedCode) => {
    if (!scannedCode.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/medicine/search?barcode=${encodeURIComponent(scannedCode.trim())}`);
      const data = await res.json();
      
      if (data.success) {
        if (data.medicine.quantity <= 0) {
          toast.error(`${data.medicine.name} is completely Sold Out!`);
        } else {
          addToCart(data.medicine);
        }
      } else {
        toast.error(data.error || "Medicine not found."); 
      }
    } catch (error) {
      toast.error("Error fetching medicine!");
    }
    
    setBarcode("");
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = (med) => {
    if (med.quantity <= 0) {
      toast.error(`${med.name} is completely Sold Out!`);
      return;
    }
    addToCart(med, 1); // Directly add to cart with quantity 1
    setShowSuggestions(false);
  };

  const handleManualSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectSuggestion(searchResults[0]);
    } else {
      toast.error("No medicine found with this name");
    }
  };

  const addToCart = (med, quantity = 1) => {
    if (med.quantity <= 0) {
      toast.error(`${med.name} is out of stock!`);
      return; 
    } 

    const existingItem = cart.find(item => item._id === med._id);
    const qtyToAdd = parseInt(quantity) || 1;
    
    if (existingItem) {
      const newQty = existingItem.sellQuantity + qtyToAdd;
      if (newQty <= med.quantity) {
        setCart(cart.map(item => item._id === med._id ? { ...item, sellQuantity: newQty } : item));
        toast.success(`Quantity updated for ${med.name}`);
      } else {
        setCart(cart.map(item => item._id === med._id ? { ...item, sellQuantity: med.quantity } : item));
        toast.error(`Cannot add more! Capped at stock limit of ${med.quantity}.`);
      }
    } else {
      const finalQty = Math.min(qtyToAdd, med.quantity);
      setCart([...cart, { ...med, sellQuantity: finalQty }]);
      toast.success(`${med.name} added to cart`);
    }

    // Reset autocomplete states
    setSearchResults([]);
    setManualSearch("");
    
    // Return focus to barcode input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const updateCartQuantity = (id, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) return;

    setCart(cart.map(item => {
      if (item._id === id) {
        if (qty > item.quantity) {
          toast.error(`Only ${item.quantity} units available in stock for ${item.name}`);
          return { ...item, sellQuantity: item.quantity };
        }
        return { ...item, sellQuantity: qty };
      }
      return item;
    }));
  };

  const removeItem = (id) => {
    setCart(cart.filter(item => item._id !== id));
    inputRef.current?.focus();
  };

  const totalCartAmount = cart.reduce((total, item) => total + ((item.mrp || 0) * item.sellQuantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/sell", {
        method: "POST",
        body: JSON.stringify({ cartItems: cart, paymentMethod }), 
        headers: { "Content-Type": "application/json" }
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ Sale Complete! Bill: ₹${data.totalAmount}`);
        setCart([]); 
        setPaymentMethod("Cash");
      } else {
        toast.error(data.error || "Error during checkout.");
      }
    } catch (error) {
      toast.error("Error during checkout.");
    }
    setCheckoutLoading(false);
    inputRef.current?.focus();
  };  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
      <Toaster position="top-center" reverseOrder={false} />

      {showCamera && (
        <CameraScanner 
          onScan={(decoded) => { setShowCamera(false); processBarcode(decoded); }} 
          onClose={() => setShowCamera(false)} 
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center mr-3 shrink-0 border border-emerald-100 shadow-sm">
            <ScanBarcode className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-slate-800 leading-tight">Fast Billing & Outward</h1>
            <p className="text-slate-500 text-[10px] md:text-sm font-medium mt-0.5">Scan barcode to deduct stock.</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowCamera(true)}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-3 md:py-2.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center transition-all shadow-lg w-full md:w-auto shrink-0"
        >
          <Camera className="w-4 h-4 md:w-4 md:h-4 mr-2" /> Use Phone Camera
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          
          {/* Barcode & Manual Search Box */}
          <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-200 flex gap-3 md:gap-4 flex-col md:flex-row">
            <form onSubmit={(e) => { e.preventDefault(); processBarcode(barcode); }} className="flex-1">
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 md:mb-3">Scan Barcode</label>
              <div className="relative">
                <input 
                  ref={inputRef} type="text" placeholder="Focus here to scan..." 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl md:rounded-2xl pl-10 md:pl-12 pr-4 py-3 md:py-4 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm md:text-base font-semibold"
                  value={barcode} onChange={(e) => setBarcode(e.target.value)} 
                />
                <ScanBarcode className="absolute left-3 md:left-4 top-3 md:top-4.5 text-slate-400 w-5 h-5 md:w-6 md:h-6" />
                {loading && <Loader2 className="absolute right-3 md:right-4 top-3 md:top-4.5 text-emerald-500 w-5 h-5 md:w-6 md:h-6 animate-spin" />}
              </div>
            </form>

            <div ref={suggestionsRef} className="flex-1 relative">
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 md:mb-3">Manual Search</label>
              <form onSubmit={handleManualSearchSubmit} className="flex">
                <input 
                  type="text" placeholder="Search name, barcode, location..." 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-l-xl md:rounded-l-2xl px-3 md:px-4 py-3 md:py-4 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all text-sm md:text-base font-semibold"
                  value={manualSearch} 
                  onChange={(e) => {
                    setManualSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />
                <button type="submit" className="bg-emerald-500 text-white px-4 md:px-5 rounded-r-xl md:rounded-r-2xl hover:bg-emerald-600 transition-colors">
                  <Search className="w-4 h-4 md:w-5 md:h-5"/>
                </button>
              </form>

              {/* Autocomplete Suggestions Dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {searchResults.map((med) => (
                    <div 
                      key={med._id} 
                      className="p-3 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer gap-2"
                      onClick={() => handleSelectSuggestion(med)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 truncate">{med.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Stock: {med.quantity}</span>
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">₹{med.mrp}</span>
                          <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">Exp: {formatExpiryDate(med.expiryDate)}</span>
                        </div>
                      </div>
                      <button 
                        type="button"
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] md:text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Display */}
          <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-200 min-h-[250px] md:min-h-[300px]">
            <h2 className="text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 md:mb-4 flex items-center">
              <ShoppingCart className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Current Cart
            </h2>
            
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 md:h-48 text-slate-400">
                <ScanBarcode className="w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-3 opacity-20" />
                <p className="font-medium text-xs md:text-sm">Cart is empty. Scan a barcode.</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {cart.map((item) => (
                  <div key={item._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 bg-slate-50/50 rounded-xl md:rounded-2xl border border-slate-200 gap-3 sm:gap-0">
                    <div className="flex-1 pr-0 sm:pr-4 min-w-0">
                      <p className="font-bold text-slate-800 text-sm md:text-lg truncate">{item.name}</p>
                      
                      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-1 mb-1.5 md:mb-2">
                        <span className="text-[9px] md:text-[10px] font-bold bg-white border border-slate-200 text-slate-600 px-1.5 md:px-2 py-0.5 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.05)]">Location: {item.batch}</span>
                        <span className="text-[9px] md:text-[10px] font-bold bg-rose-50 border border-rose-100 text-rose-600 px-1.5 md:px-2 py-0.5 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.05)]">Exp: {formatExpiryDate(item.expiryDate)}</span>
                        {item.rackNumber && <span className="text-[9px] md:text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 px-1.5 md:px-2 py-0.5 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.05)]">Rack: {item.rackNumber}</span>}
                        {item.distributor && <span className="text-[9px] md:text-[10px] font-bold bg-amber-50 border border-amber-100 text-amber-600 px-1.5 md:px-2 py-0.5 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.05)] max-w-[100px] md:max-w-[120px] truncate">Dist: {item.distributor}</span>}
                      </div>

                      <p className="text-xs md:text-sm text-emerald-600 font-extrabold">₹{item.mrp || 0} / unit</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3 md:space-x-4 shrink-0 bg-white sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border sm:border-none border-slate-100">
                      <div className="flex items-center bg-slate-50 sm:bg-white border border-slate-200 rounded-lg md:rounded-xl shadow-sm h-8 md:h-10 overflow-hidden">
                        <button 
                          type="button"
                          onClick={() => updateCartQuantity(item._id, item.sellQuantity - 1)}
                          className="px-2 md:px-3 h-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 font-extrabold text-xs md:text-sm border-r border-slate-200 transition-colors"
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={item.sellQuantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              updateCartQuantity(item._id, val);
                            }
                          }}
                          className="w-10 md:w-12 text-center bg-transparent border-none font-bold text-slate-700 text-xs md:text-sm focus:outline-none focus:ring-0 p-0"
                        />
                        <button 
                          type="button"
                          onClick={() => updateCartQuantity(item._id, item.sellQuantity + 1)}
                          className="px-2 md:px-3 h-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 font-extrabold text-xs md:text-sm border-l border-slate-200 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <div className="font-bold text-base md:text-lg text-slate-800 min-w-[65px] md:min-w-[80px] text-right">
                        ₹{(item.mrp || 0) * item.sellQuantity}
                      </div>
                      <button onClick={() => removeItem(item._id)} className="p-1.5 md:p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg md:rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Checkout Sidebar */}
        <div className="bg-slate-800 p-5 md:p-8 rounded-[24px] md:rounded-3xl shadow-lg flex flex-col justify-between text-white lg:h-[450px] lg:sticky lg:top-24">
          <div>
            <h2 className="text-base md:text-lg font-bold text-emerald-400 mb-4 md:mb-6 flex items-center border-b border-slate-700 pb-3 md:pb-4">
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" /> Summary
            </h2>
            
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <span className="text-slate-400 font-medium text-xs md:text-base">Total Items</span>
              <span className="text-lg md:text-xl font-bold">{cart.reduce((total, item) => total + item.sellQuantity, 0)}</span>
            </div>

            <div className="flex justify-between items-center mb-5 md:mb-6 pt-3 md:pt-4 border-t border-slate-700">
              <span className="text-slate-300 font-bold text-sm md:text-base">Total Amount</span>
              <span className="text-2xl md:text-3xl font-bold text-emerald-400 flex items-center">
                <IndianRupee className="w-5 h-5 md:w-6 md:h-6 mr-0.5 md:mr-1" /> {totalCartAmount}
              </span>
            </div>

            <div className="mb-5 md:mb-6">
              <label className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider font-bold mb-1.5 md:mb-2 block">Payment Method</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-700 border-none text-white rounded-xl px-3 md:px-4 py-2.5 md:py-3 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer text-xs md:text-base"
              >
                <option value="Cash">💵 Cash</option>
                <option value="UPI">📱 UPI / PhonePe</option>
                <option value="Card">💳 Card</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleCheckout} 
            disabled={cart.length === 0 || checkoutLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm md:text-lg px-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkoutLoading ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : "Complete Sale"}
          </button>
        </div>
      </div>
    </div>
  );
}