"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/lib/auth";
import { ShieldAlert, LogOut } from "lucide-react";

// Pages that render without the sidebar/header shell
const BARE_PATHS = ["/", "/login", "/admin", "/setup", "/forgot-password", "/reset-password"];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { supportTenant, exitSupportMode } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isBare = BARE_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (isBare) return <>{children}</>;

  return (
    <div className="flex h-full">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Support mode banner */}
        {supportTenant && (
          <div className="bg-[#753991] px-4 py-2 flex items-center gap-3 shrink-0">
            <ShieldAlert size={15} className="text-white shrink-0" />
            <span className="text-white text-xs font-medium flex-1">
              מצב תמיכה — צופה בנתוני: <span className="font-bold">{supportTenant.tenantName}</span>
            </span>
            <button
              onClick={() => { exitSupportMode(); router.push("/admin"); }}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-medium transition-colors"
            >
              <LogOut size={13} /> יציאה ממצב תמיכה
            </button>
          </div>
        )}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
