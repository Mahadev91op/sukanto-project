import { Package, AlertCircle, TrendingDown, IndianRupee } from "lucide-react";

export default function StatCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
      
      {/* 1. Today's Revenue (NEW) */}
      <div className="bg-white p-3.5 md:p-6 rounded-[20px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col-reverse md:flex-row md:items-center justify-between group hover:-translate-y-1 transition-all duration-300 cursor-pointer">
        <div className="mt-2 md:mt-0">
          <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Revenue</p>
          <h3 className="text-xl md:text-3xl font-extrabold text-emerald-600 mt-0.5 md:mt-2">₹{(stats.todayRevenue || 0).toLocaleString('en-IN')}</h3>
        </div>
        <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-50 text-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center self-end md:self-auto">
          <IndianRupee className="w-4 h-4 md:w-6 md:h-6" />
        </div>
      </div>

      {/* 2. Total Units Stock */}
      <div className="bg-white p-3.5 md:p-6 rounded-[20px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col-reverse md:flex-row md:items-center justify-between group hover:-translate-y-1 transition-all duration-300 cursor-pointer">
        <div className="mt-2 md:mt-0">
          <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Units</p>
          <h3 className="text-xl md:text-3xl font-extrabold text-slate-700 mt-0.5 md:mt-2 group-hover:text-indigo-600 transition-colors">{(stats.totalUnits || 0).toLocaleString('en-IN')}</h3>
        </div>
        <div className="w-8 h-8 md:w-12 md:h-12 bg-indigo-50 text-indigo-500 rounded-xl md:rounded-2xl flex items-center justify-center self-end md:self-auto">
          <Package className="w-4 h-4 md:w-6 md:h-6" />
        </div>
      </div>

      {/* 3. Expiry Alerts */}
      <div className="bg-white p-3.5 md:p-6 rounded-[20px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col-reverse md:flex-row md:items-center justify-between group hover:-translate-y-1 transition-all duration-300 cursor-pointer">
        <div className="mt-2 md:mt-0">
          <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Expiring</p>
          <h3 className="text-xl md:text-3xl font-extrabold text-rose-500 mt-0.5 md:mt-2">{stats.expiringCount || 0}</h3>
        </div>
        <div className="w-8 h-8 md:w-12 md:h-12 bg-rose-50 text-rose-500 rounded-xl md:rounded-2xl flex items-center justify-center self-end md:self-auto">
          <AlertCircle className="w-4 h-4 md:w-6 md:h-6" />
        </div>
      </div>

      {/* 4. Low Stock */}
      <div className="bg-white p-3.5 md:p-6 rounded-[20px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col-reverse md:flex-row md:items-center justify-between group hover:-translate-y-1 transition-all duration-300 cursor-pointer">
        <div className="mt-2 md:mt-0">
          <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock</p>
          <h3 className="text-xl md:text-3xl font-extrabold text-amber-500 mt-0.5 md:mt-2">{stats.lowStockCount || 0}</h3>
        </div>
        <div className="w-8 h-8 md:w-12 md:h-12 bg-amber-50 text-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center self-end md:self-auto">
          <TrendingDown className="w-4 h-4 md:w-6 md:h-6" />
        </div>
      </div>

    </div>
  );
}