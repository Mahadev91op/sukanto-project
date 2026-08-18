"use client";
import React, { useEffect, useState } from "react";
import { 
  CloudDownload, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  GitBranch, 
  Layers, 
  Sparkles,
  Database
} from "lucide-react";

export default function UpdateLoadingModal({ isUpdating, isSuccess, newVersionInfo }) {
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (!isUpdating) {
      setStep(1);
      setProgress(15);
      return;
    }

    // Step 1: Connecting to GitHub
    setStep(1);
    setProgress(20);

    const timer1 = setTimeout(() => {
      // Step 2: Downloading code
      setStep(2);
      setProgress(48);
    }, 1800);

    const timer2 = setTimeout(() => {
      // Step 3: Dependencies & Packages
      setStep(3);
      setProgress(78);
    }, 4500);

    const timer3 = setTimeout(() => {
      // Step 4: Finalizing & verifying
      setStep(4);
      setProgress(94);
    }, 7500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isUpdating]);

  useEffect(() => {
    if (isSuccess) {
      setStep(5);
      setProgress(100);
    }
  }, [isSuccess]);

  if (!isUpdating && !isSuccess) return null;

  const steps = [
    {
      id: 1,
      title: "Connecting to GitHub Cloud",
      desc: "Establishing secure link with remote repository",
      icon: GitBranch
    },
    {
      id: 2,
      title: "Downloading Latest Codebase",
      desc: "Fetching newest UI updates, features and bug fixes",
      icon: CloudDownload
    },
    {
      id: 3,
      title: "Automating Package Sync (npm)",
      desc: "Ensuring all dependencies & libraries are up-to-date",
      icon: Layers
    },
    {
      id: 4,
      title: "Verifying Database Safety & Finalizing",
      desc: "Checking database integrity (100% data isolated & safe)",
      icon: ShieldCheck
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-300">
      
      {/* Background ambient glowing orbs */}
      <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none -top-20 -left-20 animate-pulse"></div>
      <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20 animate-pulse delay-700"></div>

      {/* Main Modal Card */}
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] text-white space-y-6 overflow-hidden">
        
        {/* Top Glow bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse"></div>

        {/* Central Animated Visual */}
        <div className="text-center space-y-3 pt-2">
          
          <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin"></div>
            {/* Pulsing inner backdrop */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 blur-sm animate-pulse"></div>
            
            {/* Main Center Icon */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-xl">
              {step === 5 ? (
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-bounce" />
              ) : (
                <CloudDownload className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-pulse" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              {step === 5 ? "Update Completed" : "Cloud Update in Progress"}
            </span>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {step === 5 ? "Software Successfully Updated!" : "Updating Medical ERP..."}
            </h2>

            <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
              {step === 5 
                ? "Sabhi naye features install ho chuke hain. Page automatically reload ho raha hai..."
                : "Naya version download kiya ja raha hai. Kripya thoda intezaar karein."}
            </p>
          </div>

        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Loader2 className={`w-3.5 h-3.5 ${step === 5 ? 'hidden' : 'animate-spin text-emerald-400'}`} />
              {step === 5 ? "Completed 100%" : `Phase ${Math.min(step, 4)} of 4`}
            </span>
            <span className="font-mono text-emerald-400 font-extrabold">{progress}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Step-by-Step Live Status List */}
        <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          {steps.map((item) => {
            const Icon = item.icon;
            const isCurrent = step === item.id;
            const isDone = step > item.id || step === 5;

            return (
              <div 
                key={item.id}
                className={`flex items-start gap-3 p-2 rounded-xl transition-all ${
                  isCurrent 
                    ? 'bg-emerald-500/10 border border-emerald-500/30' 
                    : isDone
                    ? 'opacity-80'
                    : 'opacity-40'
                }`}
              >
                <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isDone 
                    ? 'bg-emerald-500 text-white' 
                    : isCurrent 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400' 
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${isCurrent ? 'text-emerald-300' : isDone ? 'text-slate-200' : 'text-slate-500'}`}>
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Safety & Anti-Data Loss Banner */}
        <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Database className="w-4 h-4" />
          </div>
          <div className="text-[11px] leading-tight text-emerald-200/90 font-medium">
            <span className="font-extrabold text-emerald-300 block mb-0.5">100% Database Safe & Protected</span>
            Aapka medicines stock, distributor data aur pichhle bills bilkul safe hain.
          </div>
        </div>

        {/* Bottom Caution Note */}
        <p className="text-[10px] text-slate-400 text-center font-semibold">
          ⚠️ Kripya is dauran browser ya computer band na karein. Update jaldi pura ho jayega.
        </p>

      </div>

    </div>
  );
}
