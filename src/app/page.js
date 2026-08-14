"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCards from "@/components/dashboard/StatCards";
import ExpiryAlerts from "@/components/dashboard/ExpiryAlerts";
import SalesChart from "@/components/dashboard/SalesChart";
import toast from "react-hot-toast";

export default function Dashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
      } else if (!silent) {
        toast.error("Failed to load dashboard data");
      }
    } catch (error) {
      if (!silent) toast.error("Network or Server error occurred!");
    }
    if (!silent) setLoading(false);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData(true);
    setTimeout(() => setIsRefreshing(false), 500); 
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 5 minutes — reduces server load for local use
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8 max-w-7xl mx-auto relative">
      
      <div className="flex justify-end gap-3 flex-wrap">
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center text-xs md:text-sm font-bold bg-white border border-slate-200 text-slate-600 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl shadow-sm hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 transition-all focus:outline-none z-10"
        >
          <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      <div className="mt-[-1rem] md:mt-[-2rem]">
        <DashboardHeader />
      </div>

      <StatCards stats={dashboardData?.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <SalesChart data={dashboardData?.salesData} />
        <ExpiryAlerts alerts={dashboardData?.expiringMedicines} />
      </div>
    </div>
  );
}