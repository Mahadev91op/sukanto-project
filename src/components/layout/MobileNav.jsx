"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  PackagePlus, 
  ScanBarcode, 
  BarChart3, 
  Package,
  Truck,
  History
} from 'lucide-react';
import { useSession } from 'next-auth/react';

const MobileNav = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Navigation Links - Inhe Sidebar ke sath match kiya gaya hai
  const navLinks = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin'] },
    { name: 'Inventory', icon: Package, path: '/inventory', roles: ['admin'] },
    { name: 'Purchase', icon: PackagePlus, path: '/purchase', roles: ['admin'] },
    { name: 'Billing', icon: ScanBarcode, path: '/sell', roles: ['admin', 'staff'] },
    { name: 'Distributors', icon: Truck, path: '/distributors', roles: ['admin'] },
    { name: 'History', icon: History, path: '/history', roles: ['admin'] },
    { name: 'Reports', icon: BarChart3, path: '/reports', roles: ['admin'] },
  ];

  const filteredLinks = navLinks.filter(link => 
    link.roles.includes(session?.user?.role)
  );

  return (
    <div className="lg:hidden">
      {/* Bottom Navigation Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
        {/* Yahan slice(0, 4) hata diya gaya hai taaki saare 5 links ek sath dikhein */}
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.path;
          return (
            <Link key={link.path} href={link.path} className="flex flex-col items-center space-y-1">
              <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-400'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                {link.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNav;