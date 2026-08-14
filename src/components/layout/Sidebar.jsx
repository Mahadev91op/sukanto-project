"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  PackagePlus, 
  ScanBarcode, 
  BarChart3, 
  LogOut,
  Package,
  Truck,
  History
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

const Sidebar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Navigation Links definition
  const navLinks = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin'] },
    { name: 'Inventory', icon: Package, path: '/inventory', roles: ['admin'] },
    { name: 'Purchase Entry', icon: PackagePlus, path: '/purchase', roles: ['admin'] },
    { name: 'Quick Sell', icon: ScanBarcode, path: '/sell', roles: ['admin', 'staff'] },
    { name: 'Distributors', icon: Truck, path: '/distributors', roles: ['admin'] },
    { name: 'Medicine History', icon: History, path: '/history', roles: ['admin'] },
    { name: 'Reports', icon: BarChart3, path: '/reports', roles: ['admin'] },
  ];

  // Filter links based on user role
  const filteredLinks = navLinks.filter(link => 
    link.roles.includes(session?.user?.role)
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col z-[60]">
      <div className="p-8">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <PackagePlus className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">
            MedERP
          </span>
        </div>

        <nav className="space-y-1.5">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.path;
            
            return (
              <Link
                key={link.path}
                href={link.path}
                className={`flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 font-bold' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                <span className="text-sm tracking-wide">{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-8 border-t border-slate-200 space-y-4">
        <Link href="/settings" className="block bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-200/40 transition-colors cursor-pointer group">
          <div className="flex justify-between items-center mb-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Profile & Settings</p>
            <span className="text-[8px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded">Gear</span>
          </div>
          <p className="text-sm font-bold text-slate-700 truncate">{session?.user?.name || 'User'}</p>
          <p className="text-[10px] text-emerald-600 font-extrabold uppercase">{session?.user?.role}</p>
        </Link>

        <button 
          onClick={() => signOut()}
          className="flex items-center space-x-3 px-4 py-3 w-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all duration-200 font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;