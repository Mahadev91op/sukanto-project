import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

// Viewport configuration for Native App feel
export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Zooming disable karne ke liye (native feel)
  userScalable: false,
};

export const metadata = {
  title: "Medical ERP - Smart Pharmacy Management",
  description: "Advanced medicine inventory and billing system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MedERP",
  },
  formatDetection: {
    telephone: false, // Phone numbers ko auto-link hone se roke
  },
  icons: {
    icon: "/icon-192x192.png", // <-- YE NAYI LINE ADD KARNI HAI
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <div className="min-h-screen bg-[#f1f5f9] flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
              <Header />
              <main className="flex-1 p-4 md:p-8 lg:p-10 pb-28 lg:pb-10 transition-all duration-300">
                {children}
              </main>
              <MobileNav />
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}