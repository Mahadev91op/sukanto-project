"use client";
import React from 'react';
import { useSession } from 'next-auth/react';

const DashboardHeader = () => {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome back {session?.user?.name || ''}, here is your medical store summary.</p>
      </div>
    </div>
  );
};

export default DashboardHeader;