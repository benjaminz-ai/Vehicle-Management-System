"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Users,
  Wrench,
  AlertTriangle,
  FileText,
  Kanban,
  Network,
  History,
  Settings,
  X,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "ראשי",
    items: [
      { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
      { href: "/board", label: "לוח רכבים", icon: Kanban },
    ],
  },
  {
    label: "ניהול צי",
    items: [
      { href: "/vehicles", label: "רכבים", icon: Car },
      { href: "/drivers", label: "נהגים", icon: Users },
      { href: "/assignment", label: "שיבוץ נהגים", icon: Network },
    ],
  },
  {
    label: "תיעוד",
    items: [
      { href: "/services", label: "טיפולים", icon: Wrench },
      { href: "/accidents", label: "תאונות", icon: AlertTriangle },
      { href: "/documents", label: "מסמכים", icon: FileText },
      { href: "/history", label: "היסטוריית שיבוצים", icon: History },
      { href: "/alerts", label: "התראות", icon: Bell },
      { href: "/settings", label: "הגדרות", icon: Settings },
    ],
  },
];

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "w-[220px] min-h-screen bg-[#032147] flex flex-col shrink-0 z-50",
        // Desktop: always visible
        "md:relative md:translate-x-0 md:flex",
        // Mobile: drawer from right (RTL)
        "fixed top-0 right-0 h-full transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full md:translate-x-0"
      )}>
      {/* Logo */}
      <div className="px-5 py-[18px] border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#ecad0a] flex items-center justify-center shrink-0">
            <Car size={15} className="text-[#032147]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-[13px] leading-tight">ניהול צי</div>
            <div className="text-[#ecad0a]/60 text-[10px] font-semibold tracking-widest uppercase mt-0.5">
              Fleet Manager
            </div>
          </div>
          {/* Close button – mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 flex flex-col gap-6 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em]">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-[9px] rounded-xl text-[13px] font-medium transition-all duration-150 group",
                      active
                        ? "bg-white/[0.11] text-white"
                        : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#ecad0a]" />
                    )}
                    <Icon
                      size={15}
                      className={cn(
                        "shrink-0 transition-colors",
                        active
                          ? "text-[#ecad0a]"
                          : "text-white/40 group-hover:text-white/60"
                      )}
                    />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.07]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-white/25 text-[11px]">מחובר · v1.0</span>
        </div>
      </div>
    </aside>
    </>
  );
}
