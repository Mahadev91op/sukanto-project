import { AlertCircle, ArrowRight, PackageOpen } from "lucide-react";
import Link from "next/link";
import { formatExpiryDate } from "@/lib/formatDate";

export default function ExpiryAlerts({ alerts }) {
  
  // Kitne din bache hain ye auto calculate karne ka logic
  const calculateDaysLeft = (expiryDate) => {
    const today = new Date();
    const exp = new Date(expiryDate);
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="bg-white rounded-[24px] md:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-100 p-4 md:p-6 hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h2 className="text-sm md:text-lg font-bold text-slate-700 flex items-center">
          <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-rose-400 mr-2 md:mr-3 animate-pulse"></span>
          Urgent Expiry Alerts
        </h2>
        <Link href="/reports">
          <button className="text-[10px] md:text-sm text-emerald-600 font-bold hover:text-emerald-700 flex items-center group bg-emerald-50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl transition-colors shrink-0">
            View All <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </button>
        </Link>
      </div>
      
      <div className="space-y-2.5 md:space-y-3 flex-1 overflow-y-auto custom-scrollbar max-h-[300px]">
        {!alerts || alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-slate-400">
            <PackageOpen className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">No medicines expiring soon! 🎉</p>
          </div>
        ) : (
          alerts.map((med) => {
            const daysLeft = calculateDaysLeft(med.expiryDate);
            return (
              <div key={med._id} className="flex justify-between items-center p-3 md:p-4 bg-rose-50/40 rounded-xl md:rounded-2xl border border-rose-100/60 hover:bg-rose-50 transition-colors cursor-pointer group">
                <div className="flex-1 pr-2 min-w-0">
                  <span className="text-xs md:text-base font-bold text-slate-800 block group-hover:text-rose-600 transition-colors truncate" title={med.name}>{med.name}</span>
                  <span className="text-[9px] md:text-xs font-semibold text-slate-500 block mt-0.5">Location: {med.batch} | Qty: {med.quantity}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] md:text-sm text-rose-600 font-bold block">{formatExpiryDate(med.expiryDate)}</span>
                  {/* Agar 15 din se kam bache hain toh red alert me dikhega */}
                  <span className={`text-[8px] md:text-xs font-semibold px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-md md:rounded-lg mt-0.5 md:mt-1 inline-block ${daysLeft <= 15 ? 'text-white bg-rose-500 shadow-md' : 'text-rose-500 bg-rose-100/50'}`}>
                    {daysLeft} Days left
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}