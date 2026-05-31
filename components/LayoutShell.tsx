"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

// Pages that render without the sidebar/header shell
const BARE_PATHS = ["/login", "/admin", "/setup", "/forgot-password", "/reset-password"];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));

  if (isBare) return <>{children}</>;

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
