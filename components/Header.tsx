"use client";
import { useState, useCallback } from "react";
import { Search, X, Bell, LogOut, Menu } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { vehicles, drivers, vehicleStatuses, vehicleTypes, fuelTypes } = useStore();
  const { profile, logout } = useAuth();
  const router = useRouter();

  const results = useCallback(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const found: { type: string; id: string; label: string; sub: string; href: string }[] = [];

    vehicles.forEach(v => {
      const status = vehicleStatuses.find(s => s.id === v.statusId);
      const vtype = vehicleTypes.find(t => t.id === v.vehicleTypeId);
      const ftype = fuelTypes.find(f => f.id === v.fuelTypeId);
      const searchable = [
        v.licensePlate, v.manufacturer, v.model, String(v.year),
        status?.name, vtype?.name, ftype?.name, v.leasingCompanyName,
      ].filter(Boolean).join(" ").toLowerCase();
      if (searchable.includes(q)) {
        // Add courtesy marker to label/sub if relevant
        const isCourtesyActive = v.isCourtesy && !v.courtesyActualReturnDate;
        const isCourtesyReturned = v.isCourtesy && v.courtesyActualReturnDate;
        const hasActiveCourtesy = !v.isCourtesy && vehicles.some(c => c.isCourtesy && c.parentVehicleId === v.id && !c.courtesyActualReturnDate);
        const typeLabel = isCourtesyActive ? "🔄 חלופי" : isCourtesyReturned ? "חלופי הוחזר" : "רכב";
        const subLine = hasActiveCourtesy ? `${status?.name ?? ""} · בחלופי` : (status?.name ?? "");
        found.push({
          type: typeLabel,
          id: v.id,
          label: `${v.manufacturer} ${v.model} (${v.licensePlate})`,
          sub: subLine,
          href: `/vehicles/${v.id}`,
        });
      }
    });

    drivers.forEach(d => {
      const searchable = [d.fullName, d.firstName, d.lastName, d.uniqueId, d.driverLicenseNumber]
        .join(" ").toLowerCase();
      if (searchable.includes(q)) {
        found.push({
          type: "נהג",
          id: d.id,
          label: d.fullName,
          sub: `ת.ז: ${d.uniqueId}`,
          href: `/drivers/${d.id}`,
        });
      }
    });

    return found.slice(0, 8);
  }, [query, vehicles, drivers, vehicleStatuses, vehicleTypes, fuelTypes]);

  const hits = results();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const displayName = profile?.firstName?.trim() || profile?.email?.split("@")[0] || "";
  const initials = profile
    ? (profile.firstName?.charAt(0) ?? "") + (profile.lastName?.charAt(0) ?? "") || displayName.charAt(0).toUpperCase()
    : "?";

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-3 sm:px-6 gap-3 relative z-40">
      {/* Hamburger – mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
      >
        <Menu size={18} />
      </button>
      <div className="relative flex-1 sm:flex-none sm:w-64 md:w-80 lg:max-w-md lg:flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className="w-full pl-9 pr-4 h-9 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7] transition-all"
          placeholder="חיפוש רכבים, נהגים..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={13} />
          </button>
        )}
        {open && hits.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
            {hits.map(h => (
              <button
                key={h.id}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] text-left transition-colors border-b border-gray-50 last:border-0"
                onClick={() => { router.push(h.href); setQuery(""); setOpen(false); }}
              >
                <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${h.type === "רכב" ? "bg-[#209dd7]/10 text-[#209dd7]" : "bg-[#753991]/10 text-[#753991]"}`}>
                  {h.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{h.label}</div>
                  <div className="text-xs text-gray-400">{h.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mr-auto">
        {profile && (
          <span className="hidden sm:block text-sm text-gray-500 leading-tight text-right">
            {profile.tenantName && (
              <span className="block text-[11px] text-gray-400 font-medium">{profile.tenantName}</span>
            )}
            שלום{displayName ? ", " : ""}<span className="font-semibold text-[#032147]">{displayName}</span>
          </span>
        )}
        <button className="relative w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
          <Bell size={15} />
        </button>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-xl bg-[#032147] flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <button
            onClick={handleLogout}
            title="יציאה"
            className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
