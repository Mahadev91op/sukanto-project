"use client";
import { useState, useEffect, useRef } from "react";
import { Search, UserCircle, LogOut, Package, IndianRupee, X, Settings } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Real-time Search Logic with Debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.trim().length > 1) {
        setIsSearching(true);
        try {
          const res = await fetch('/api/medicine?limit=200');
          const data = await res.json();
          if (data.success) {
            // Filter by name and get top 5 results
            const found = data.medicines.filter(m => 
              m.name.toLowerCase().includes(searchTerm.toLowerCase())
            ).slice(0, 5); 
            
            setResults(found);
            setShowDropdown(true);
          }
        } catch (error) {
          console.error("Search error", error);
        }
        setIsSearching(false);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 400); // 400ms delay to prevent too many API calls

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Agar login nahi hai, toh Header mat dikhao
  if (!session) return null;

  return (
    <header className="h-16 md:h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50">
      
      {/* 1. Global Quick Search Bar */}
      <div ref={searchRef} className="relative flex flex-1 md:flex-none items-center bg-slate-50 hover:bg-slate-100 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl md:w-[400px] border border-slate-200/60 transition-all duration-300 mr-4 group focus-within:ring-4 focus-within:ring-emerald-50 focus-within:border-emerald-200">
        <Search className={`w-4 h-4 mr-2 md:mr-3 shrink-0 ${isSearching ? 'text-emerald-500 animate-pulse' : 'text-slate-400 group-focus-within:text-emerald-500'}`} />
        <input 
          type="text" 
          placeholder="Quick search medicine stock..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.trim().length > 1 && setShowDropdown(true)}
          className="bg-transparent border-none outline-none w-full text-xs md:text-sm text-slate-800 placeholder-slate-400 font-bold"
        />
        {searchTerm && (
          <button onClick={() => {setSearchTerm(""); setShowDropdown(false);}} className="text-slate-400 hover:text-rose-500 ml-2 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Live Search Results Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden z-50">
            {results.length > 0 ? (
              <div className="p-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-2 pt-1 border-b border-slate-50 mb-1">Live Stock Check</p>
                {results.map(med => (
                  <div 
                    key={med._id} 
                    onClick={() => { router.push('/inventory'); setShowDropdown(false); }} 
                    className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100 group/item"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm group-hover/item:text-emerald-600 transition-colors">{med.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">Location: {med.batch}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-extrabold ${med.quantity < 10 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {med.quantity} <span className="text-[10px] font-semibold opacity-70">in stock</span>
                      </p>
                      <p className="text-xs font-bold text-slate-500 flex items-center justify-end mt-0.5">
                        <IndianRupee className="w-3 h-3 mr-0.5"/> {med.mrp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-slate-500 font-bold bg-slate-50/50">
                Koi dawai stock mein nahi mili.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Quick Actions & Profile */}
      <div className="flex items-center space-x-3 md:space-x-6 shrink-0">
        
        {/* New Sale Quick Button (Useful addition) */}
        <button 
          onClick={() => router.push('/sell')} 
          className="hidden md:flex items-center bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-200"
        >
          <Package className="w-4 h-4 mr-2 text-emerald-400" /> New Sale
        </button>
        
        <div className="flex items-center space-x-3 md:border-l pl-0 md:pl-6 border-slate-100">
          <div className="bg-slate-50 p-1.5 md:p-2 rounded-xl border border-slate-200/60 hidden md:block">
            <UserCircle className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-bold text-slate-700 capitalize">{session?.user?.name}</p>
            <p className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5 inline-block">
              {session?.user?.role}
            </p>
          </div>
          
          {/* Settings Button */}
          <button 
            onClick={() => router.push('/settings')}
            className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all shadow-sm"
            title="Printer Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Logout Button */}
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-2 p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}