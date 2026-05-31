"use client";
import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { Search, Calendar, Car, Users, Clock, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysBetween(start: string, end: string) {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function formatDuration(start: string, end?: string) {
  const days = daysBetween(start, end ?? new Date().toISOString().slice(0, 10));
  if (days < 30)  return `${days} ימים`;
  if (days < 365) return `${Math.floor(days / 30)} חודשים`;
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return m > 0 ? `${y} שנ' ${m} חד'` : `${y} שנ'`;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { assignmentLogs, drivers, vehicles } = useStore();

  const [driverFilter,  setDriverFilter]  = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [statusFilter,  setStatusFilter]  = useState<"all" | "active" | "closed">("all");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [search,        setSearch]        = useState("");

  const filtered = useMemo(() => {
    return assignmentLogs
      .filter(l => {
        if (driverFilter  && l.driverId  !== driverFilter)  return false;
        if (vehicleFilter && l.vehicleId !== vehicleFilter) return false;
        if (statusFilter === "active" && l.endDate)          return false;
        if (statusFilter === "closed" && !l.endDate)         return false;
        if (dateFrom && l.startDate < dateFrom)              return false;
        if (dateTo   && l.startDate > dateTo)                return false;

        // text search
        if (search.trim()) {
          const driver  = drivers.find(d => d.id === l.driverId);
          const vehicle = vehicles.find(v => v.id === l.vehicleId);
          const hay = [
            driver?.fullName, vehicle?.licensePlate,
            vehicle?.manufacturer, vehicle?.model, l.notes,
          ].filter(Boolean).join(" ").toLowerCase();
          if (!hay.includes(search.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // active first, then by startDate desc
        if (!a.endDate && b.endDate)  return -1;
        if (a.endDate  && !b.endDate) return 1;
        return b.startDate.localeCompare(a.startDate);
      });
  }, [assignmentLogs, driverFilter, vehicleFilter, statusFilter, dateFrom, dateTo, search, drivers, vehicles]);

  // Summary stats
  const activeCount  = assignmentLogs.filter(l => !l.endDate).length;
  const closedCount  = assignmentLogs.filter(l =>  l.endDate).length;
  const avgDays = (() => {
    const closed = assignmentLogs.filter(l => l.endDate);
    if (!closed.length) return 0;
    return Math.round(closed.reduce((s, l) => s + daysBetween(l.startDate, l.endDate!), 0) / closed.length);
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#032147]">היסטוריית שיבוצים</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          לוג מלא של כל הקשרים בין נהגים לרכבים לאורך הזמן
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "שיבוצים פעילים",  value: activeCount, icon: Users, accent: "bg-emerald-50 text-emerald-600" },
          { label: "שיבוצים מסויימים", value: closedCount, icon: Clock,  accent: "bg-gray-100 text-gray-500"    },
          { label: "ממוצע ימים לשיבוץ", value: avgDays,   icon: Calendar,accent: "bg-sky-50 text-sky-600"       },
        ].map(({ label, value, icon: Icon, accent }) => {
          const [bg, text] = accent.split(" ");
          return (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${bg} ${text} flex items-center justify-center shrink-0`}>
                <Icon size={18} />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#032147]">{value}</div>
                <div className="text-xs text-gray-500 font-medium">{label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="pl-9 pr-4 h-9 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all w-52"
              placeholder="חיפוש חופשי..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Driver */}
          <Select
            value={driverFilter}
            onChange={e => setDriverFilter(e.target.value)}
            className="w-44"
          >
            <option value="">כל הנהגים</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </Select>

          {/* Vehicle */}
          <Select
            value={vehicleFilter}
            onChange={e => setVehicleFilter(e.target.value)}
            className="w-52"
          >
            <option value="">כל הרכבים</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.manufacturer} {v.model} ({v.licensePlate})
              </option>
            ))}
          </Select>

          {/* Status */}
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as "all" | "active" | "closed")}
            className="w-36"
          >
            <option value="all">כל הסטטוסים</option>
            <option value="active">פעילים בלבד</option>
            <option value="closed">מסויימים בלבד</option>
          </Select>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">מתאריך</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">עד תאריך</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all"
            />
          </div>

          {/* Reset */}
          {(driverFilter || vehicleFilter || statusFilter !== "all" || dateFrom || dateTo || search) && (
            <button
              onClick={() => {
                setDriverFilter(""); setVehicleFilter(""); setStatusFilter("all");
                setDateFrom(""); setDateTo(""); setSearch("");
              }}
              className="h-9 px-3 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              נקה סינון
            </button>
          )}

          <div className="mr-auto text-xs text-gray-400 self-center">
            {filtered.length} רשומות
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[550px]">
          <thead>
            <tr className="border-b border-gray-50 bg-[#f8fafc]">
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">נהג</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">רכב</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">תחילת שיבוץ</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">סיום שיבוץ</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">משך</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">סטטוס</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">הערות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(log => {
              const driver  = drivers.find(d => d.id === log.driverId);
              const vehicle = vehicles.find(v => v.id === log.vehicleId);
              const isActive = !log.endDate;

              return (
                <tr key={log.id} className="hover:bg-[#f8fafc] transition-colors">
                  {/* Driver */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#032147]/10 flex items-center justify-center text-[#032147] font-bold text-[10px] shrink-0">
                        {driver?.firstName?.[0]}{driver?.lastName?.[0]}
                      </div>
                      <span className="font-medium text-[#032147] text-sm">
                        {driver?.fullName ?? "—"}
                      </span>
                    </div>
                  </td>

                  {/* Vehicle */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Car size={13} className="text-[#209dd7] shrink-0" />
                      <div>
                        <div className="text-sm text-gray-700">
                          {vehicle ? `${vehicle.manufacturer} ${vehicle.model}` : "—"}
                        </div>
                        <div className="text-xs font-mono text-gray-400">
                          {vehicle?.licensePlate}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Start */}
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(log.startDate)}
                  </td>

                  {/* End */}
                  <td className="px-4 py-3">
                    {isActive ? (
                      <span className="text-xs text-emerald-600 font-semibold">פעיל עכשיו</span>
                    ) : (
                      <span className="text-sm text-gray-600">{formatDate(log.endDate!)}</span>
                    )}
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                      {formatDuration(log.startDate, log.endDate)}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    {isActive ? (
                      <Badge variant="success" dot>פעיל</Badge>
                    ) : (
                      <Badge variant="gray">הסתיים</Badge>
                    )}
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px] truncate">
                    {log.notes ?? "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                  לא נמצאו רשומות היסטוריה
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Driver profile view hint */}
      {driverFilter && (() => {
        const d = drivers.find(x => x.id === driverFilter);
        const driverLogs = filtered;
        const vehicles_driven = [...new Set(driverLogs.map(l => l.vehicleId))];
        return (
          <div className="bg-[#032147] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                {d?.firstName?.[0]}{d?.lastName?.[0]}
              </div>
              <div>
                <p className="font-bold text-base">{d?.fullName}</p>
                <p className="text-xs text-white/50">פרופיל שיבוץ מלא</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-[#ecad0a]">{driverLogs.length}</div>
                <div className="text-xs text-white/50 mt-0.5">שיבוצים כולל</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#ecad0a]">{vehicles_driven.length}</div>
                <div className="text-xs text-white/50 mt-0.5">רכבים שונים</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#ecad0a]">
                  {driverLogs.filter(l => !l.endDate).length > 0 ? "כן" : "לא"}
                </div>
                <div className="text-xs text-white/50 mt-0.5">שיבוץ פעיל</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Vehicle profile view */}
      {vehicleFilter && (() => {
        const v = vehicles.find(x => x.id === vehicleFilter);
        const vLogs = filtered;
        const uniqueDrivers = [...new Set(vLogs.map(l => l.driverId))];
        return (
          <div className="bg-[#032147] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ecad0a] flex items-center justify-center">
                <Car size={18} className="text-[#032147]" />
              </div>
              <div>
                <p className="font-bold text-base">
                  {v?.manufacturer} {v?.model}
                  <span className="font-mono text-sm text-white/50 mr-2">({v?.licensePlate})</span>
                </p>
                <p className="text-xs text-white/50">פרופיל שיבוץ רכב</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-[#ecad0a]">{vLogs.length}</div>
                <div className="text-xs text-white/50 mt-0.5">שיבוצים כולל</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#ecad0a]">{uniqueDrivers.length}</div>
                <div className="text-xs text-white/50 mt-0.5">נהגים שונים</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#ecad0a]">
                  {vLogs.filter(l => !l.endDate).length}
                </div>
                <div className="text-xs text-white/50 mt-0.5">נהגים פעילים כעת</div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
