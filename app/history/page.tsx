"use client";
import { Fragment, useState, useMemo, useRef } from "react";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Search, Calendar, Car, Users, Clock, Download, Printer, ChevronDown, X, LogOut, Repeat } from "lucide-react";
import { formatDate, formatDateTime, COURTESY_REASON_LABELS } from "@/lib/utils";

function daysBetween(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDuration(start: string, end?: string) {
  const days = daysBetween(start, end ?? new Date().toISOString().slice(0, 10));
  if (days < 30) return `${days} ימים`;
  if (days < 365) return `${Math.floor(days / 30)} חודשים`;
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return m > 0 ? `${y} שנ' ${m} חד'` : `${y} שנ'`;
}

function exportCSV(rows: string[][], filename: string) {
  const BOM = "﻿";
  const csv = BOM + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildRows(filtered: any[], drivers: any[], vehicles: any[]) {
  const header = ["נהג", "ת.ז נהג", "תפקיד", "רכב", "לוחית רישוי", "תחילת שיבוץ", "סיום שיבוץ", "משך", "סטטוס", "הערות"];
  const data = filtered.map((log: any) => {
    const driver = drivers.find((d: any) => d.id === log.driverId);
    const vehicle = vehicles.find((v: any) => v.id === log.vehicleId);
    const isActive = !log.endDate;
    const roleLabel = log.role === "secondary" ? "משני" : log.role === "main" ? "ראשי" : "—";
    return [
      driver?.fullName ?? "—",
      driver?.uniqueId ?? "—",
      roleLabel,
      vehicle ? `${vehicle.manufacturer} ${vehicle.model}` : "—",
      vehicle?.licensePlate ?? "—",
      formatDate(log.startDate),
      isActive ? "פעיל עכשיו" : formatDate(log.endDate),
      formatDuration(log.startDate, log.endDate),
      isActive ? "פעיל" : "הסתיים",
      log.notes ?? "",
    ];
  });
  return [header, ...data];
}

function openPrintWindow(filtered: any[], drivers: any[], vehicles: any[], filters: any) {
  const driverName = filters.driver ? drivers.find((d: any) => d.id === filters.driver)?.fullName : null;
  const vehicleName = filters.vehicle ? vehicles.find((v: any) => v.id === filters.vehicle) : null;
  const filterDesc = [
    driverName ? `נהג: ${driverName}` : null,
    vehicleName ? `רכב: ${vehicleName.manufacturer} ${vehicleName.model} (${vehicleName.licensePlate})` : null,
    filters.status !== "all" ? (filters.status === "active" ? "פעילים בלבד" : "מסויימים בלבד") : null,
    filters.dateFrom ? `מ-${formatDate(filters.dateFrom)}` : null,
    filters.dateTo ? `עד ${formatDate(filters.dateTo)}` : null,
  ].filter(Boolean).join(" | ") || "כל השיבוצים";

  const rows = filtered.map((log: any) => {
    const driver = drivers.find((d: any) => d.id === log.driverId);
    const vehicle = vehicles.find((v: any) => v.id === log.vehicleId);
    const isActive = !log.endDate;
    const roleLabel = log.role === "secondary" ? "משני" : log.role === "main" ? "ראשי" : "—";
    return `<tr>
      <td>${driver?.fullName ?? "—"}</td>
      <td>${roleLabel}</td>
      <td>${vehicle ? `${vehicle.manufacturer} ${vehicle.model}` : "—"}<br/><small>${vehicle?.licensePlate ?? ""}</small></td>
      <td>${formatDate(log.startDate)}</td>
      <td>${isActive ? '<span class="active">פעיל עכשיו</span>' : formatDate(log.endDate)}</td>
      <td>${formatDuration(log.startDate, log.endDate)}</td>
      <td>${isActive ? '<span class="badge-active">פעיל</span>' : '<span class="badge-closed">הסתיים</span>'}</td>
      <td>${log.notes ?? "—"}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he"><head><meta charset="UTF-8"/><title>היסטוריית שיבוצים</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a2e; padding: 20px; direction: rtl; }
.header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #032147; }
.title { font-size: 20px; font-weight: bold; color: #032147; }
.filter-bar { background: #f0f4f8; border-radius: 8px; padding: 8px 12px; margin-bottom: 16px; font-size: 11px; color: #444; }
table { width: 100%; border-collapse: collapse; }
thead tr { background: #032147; color: white; }
th { padding: 8px 10px; text-align: right; font-size: 11px; }
td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
tr:nth-child(even) td { background: #fafbfc; }
small { color: #888; font-size: 10px; }
.active { color: #059669; font-weight: 600; }
.badge-active { background: #dcfce7; color: #16a34a; padding: 2px 7px; border-radius: 10px; font-size: 10px; }
.badge-closed { background: #f1f5f9; color: #64748b; padding: 2px 7px; border-radius: 10px; font-size: 10px; }
</style></head><body>
<div class="header"><div><div class="title">היסטוריית שיבוצים</div></div><div style="font-size:10px;color:#888">הופק: ${new Date().toLocaleDateString("he-IL")}<br/>${filtered.length} רשומות</div></div>
<div class="filter-bar">סינון: ${filterDesc}</div>
<table><thead><tr><th>נהג</th><th>תפקיד</th><th>רכב</th><th>תחילת שיבוץ</th><th>סיום שיבוץ</th><th>משך</th><th>סטטוס</th><th>הערות</th></tr></thead>
<tbody>${rows}</tbody></table>
<script>window.onload = () => window.print();</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

function ExportMenu({ onExcel, onReport }: { onExcel: () => void; onReport: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button onClick={() => setOpen(o => !o)} variant="outline" className="flex items-center gap-1.5">
        <Download size={14} /> ייצוא <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden" onMouseLeave={() => setOpen(false)}>
          <button onClick={() => { onExcel(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#f0fdf4] transition-colors">
            <span className="w-6 h-6 rounded bg-green-100 flex items-center justify-center text-green-700 text-[10px] font-bold shrink-0">XLS</span>
            ייצוא לאקסל
          </button>
          <button onClick={() => { onReport(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#eff6ff] transition-colors border-t border-gray-50">
            <span className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center shrink-0">
              <Printer size={12} className="text-blue-600" />
            </span>
            דו&quot;ח להדפסה
          </button>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { assignmentLogs, drivers, vehicles, unassignDriverFromVehicle } = useStore();
  const [endingLog, setEndingLog] = useState<{ id: string; driverId: string; vehicleId: string } | null>(null);

  const [driverFilter, setDriverFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return assignmentLogs
      .filter(l => {
        if (driverFilter && l.driverId !== driverFilter) return false;
        if (vehicleFilter && l.vehicleId !== vehicleFilter) return false;
        if (statusFilter === "active" && l.endDate) return false;
        if (statusFilter === "closed" && !l.endDate) return false;
        if (dateFrom && l.startDate < dateFrom) return false;
        if (dateTo && l.startDate > dateTo) return false;
        if (search.trim()) {
          const driver = drivers.find(d => d.id === l.driverId);
          const vehicle = vehicles.find(v => v.id === l.vehicleId);
          const hay = [driver?.fullName, vehicle?.licensePlate, vehicle?.manufacturer, vehicle?.model, l.notes]
            .filter(Boolean).join(" ").toLowerCase();
          if (!hay.includes(search.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (!a.endDate && b.endDate) return -1;
        if (a.endDate && !b.endDate) return 1;
        return b.startDate.localeCompare(a.startDate);
      });
  }, [assignmentLogs, driverFilter, vehicleFilter, statusFilter, dateFrom, dateTo, search, drivers, vehicles]);

  const activeCount = assignmentLogs.filter(l => !l.endDate).length;
  const closedCount = assignmentLogs.filter(l => l.endDate).length;
  const avgDays = (() => {
    const closed = assignmentLogs.filter(l => l.endDate);
    if (!closed.length) return 0;
    return Math.round(closed.reduce((s, l) => s + daysBetween(l.startDate, l.endDate!), 0) / closed.length);
  })();

  const filters = { driver: driverFilter, vehicle: vehicleFilter, status: statusFilter, dateFrom, dateTo };

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">היסטוריית שיבוצים</h1>
          <p className="text-sm text-gray-500 mt-0.5">לוג מלא של כל הקשרים בין נהגים לרכבים לאורך הזמן</p>
        </div>
        <ExportMenu
          onExcel={() => exportCSV(buildRows(filtered, drivers, vehicles), `שיבוצים_${new Date().toISOString().slice(0, 10)}.csv`)}
          onReport={() => openPrintWindow(filtered, drivers, vehicles, filters)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "שיבוצים פעילים", value: activeCount, icon: Users, accent: "bg-emerald-50 text-emerald-600" },
          { label: "שיבוצים מסויימים", value: closedCount, icon: Clock, accent: "bg-gray-100 text-gray-500" },
          { label: "ממוצע ימים לשיבוץ", value: avgDays, icon: Calendar, accent: "bg-sky-50 text-sky-600" },
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="pl-9 pr-4 h-9 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all w-52"
              placeholder="חיפוש חופשי..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={driverFilter} onChange={e => setDriverFilter(e.target.value)} className="w-44">
            <option value="">כל הנהגים</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
          </Select>
          <Select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} className="w-52">
            <option value="">כל הרכבים</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.manufacturer} {v.model} ({v.licensePlate})</option>)}
          </Select>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | "active" | "closed")} className="w-36">
            <option value="all">כל הסטטוסים</option>
            <option value="active">פעילים בלבד</option>
            <option value="closed">מסויימים בלבד</option>
          </Select>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">מתאריך</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">עד תאריך</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all" />
          </div>
          {(driverFilter || vehicleFilter || statusFilter !== "all" || dateFrom || dateTo || search) && (
            <button
              onClick={() => { setDriverFilter(""); setVehicleFilter(""); setStatusFilter("all"); setDateFrom(""); setDateTo(""); setSearch(""); }}
              className="h-9 px-3 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              נקה סינון
            </button>
          )}
          <div className="mr-auto text-xs text-gray-400 self-center">{filtered.length} רשומות</div>
        </div>
      </div>

      {(driverFilter || vehicleFilter || statusFilter !== "all" || dateFrom || dateTo) && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400">סינון פעיל:</span>
          {driverFilter && (
            <span className="inline-flex items-center gap-1 bg-[#032147]/10 text-[#032147] text-xs px-2.5 py-1 rounded-full font-medium">
              <Users size={11} /> {drivers.find(d => d.id === driverFilter)?.fullName}
              <button onClick={() => setDriverFilter("")} className="hover:text-red-500 mr-1"><X size={10} /></button>
            </span>
          )}
          {vehicleFilter && (() => {
            const v = vehicles.find(x => x.id === vehicleFilter);
            return (
              <span className="inline-flex items-center gap-1 bg-[#209dd7]/10 text-[#209dd7] text-xs px-2.5 py-1 rounded-full font-medium">
                <Car size={11} /> {v?.manufacturer} {v?.model} ({v?.licensePlate})
                <button onClick={() => setVehicleFilter("")} className="hover:text-red-500 mr-1"><X size={10} /></button>
              </span>
            );
          })()}
          {dateFrom && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium">
              <Calendar size={11} /> מ-{formatDate(dateFrom)}
              <button onClick={() => setDateFrom("")} className="hover:text-red-500 mr-1"><X size={10} /></button>
            </span>
          )}
          {dateTo && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium">
              <Calendar size={11} /> עד {formatDate(dateTo)}
              <button onClick={() => setDateTo("")} className="hover:text-red-500 mr-1"><X size={10} /></button>
            </span>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <table className="w-full text-sm min-w-[650px]">
            <thead className="sticky top-0 z-10 bg-[#f8fafc] shadow-[0_1px_0_rgb(0_0_0/0.04)]">
              <tr className="border-b border-gray-50 bg-[#f8fafc]">
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">נהג</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">תפקיד</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">רכב</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">תחילת שיבוץ</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">סיום שיבוץ</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">משך</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">סטטוס</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">הערות</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(log => {
                const driver = drivers.find(d => d.id === log.driverId);
                const vehicle = vehicles.find(v => v.id === log.vehicleId);
                const isActive = !log.endDate;
                // Find courtesy vehicles for this main vehicle whose period overlaps with this assignment
                // A courtesy is relevant if its start is within the assignment period
                const logStart = log.startDate.slice(0, 10);
                const logEnd = log.endDate ? log.endDate.slice(0, 10) : "9999-12-31";
                const courtesyPeriods = vehicles.filter(v =>
                  v.isCourtesy &&
                  v.parentVehicleId === log.vehicleId &&
                  v.courtesyStartDate &&
                  v.courtesyStartDate >= logStart &&
                  v.courtesyStartDate <= logEnd
                ).sort((a, b) => (a.courtesyStartDate ?? "").localeCompare(b.courtesyStartDate ?? ""));
                return (
                <Fragment key={log.id}>
                  <tr className="hover:bg-[#f8fafc] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#032147]/10 flex items-center justify-center text-[#032147] font-bold text-[10px] shrink-0">
                          {driver?.firstName?.[0]}{driver?.lastName?.[0]}
                        </div>
                        <span className="font-medium text-[#032147] text-sm">{driver?.fullName ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.role === "secondary"
                        ? <span className="text-[11px] bg-purple-50 text-purple-700 font-medium px-2 py-0.5 rounded-full">משני</span>
                        : log.role === "main"
                          ? <span className="text-[11px] bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">ראשי</span>
                          : <span className="text-[11px] text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Car size={13} className="text-[#209dd7] shrink-0" />
                        <div>
                          <div className="text-sm text-gray-700">{vehicle ? `${vehicle.manufacturer} ${vehicle.model}` : "—"}</div>
                          <div className="text-xs font-mono text-gray-400">{vehicle?.licensePlate}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">{formatDateTime(log.startDate)}</td>
                    <td className="px-4 py-3">
                      {isActive
                        ? <span className="text-xs text-emerald-600 font-semibold">פעיל עכשיו</span>
                        : <span className="text-sm text-gray-600 tabular-nums">{formatDateTime(log.endDate!)}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                        {formatDuration(log.startDate, log.endDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isActive ? <Badge variant="success" dot>פעיל</Badge> : <Badge variant="gray">הסתיים</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">{log.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      {isActive && (
                        <button
                          onClick={() => setEndingLog({ id: log.id, driverId: log.driverId, vehicleId: log.vehicleId })}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg"
                        >
                          <LogOut size={11} /> סיים
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Courtesy sub-periods: shown nested under the main assignment row */}
                  {courtesyPeriods.map(c => {
                    const cActive = !c.courtesyActualReturnDate;
                    return (
                      <tr key={`courtesy-${c.id}`} className="bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 pr-9 text-[11px] text-amber-700 font-medium">
                            <span className="text-amber-400">└</span>
                            <Repeat size={10} />
                            <span>תקופת רכב חלופי</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">חלופי</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Car size={11} className="text-amber-600 shrink-0" />
                            <div>
                              <div className="text-xs text-gray-700">{c.manufacturer} {c.model}</div>
                              <div className="text-[10px] font-mono text-gray-400">{c.licensePlate}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 tabular-nums">{c.courtesyStartDate ? formatDate(c.courtesyStartDate) : "—"}</td>
                        <td className="px-4 py-2.5">
                          {cActive
                            ? <span className="text-[11px] text-amber-600 font-semibold">פעיל</span>
                            : <span className="text-xs text-gray-600 tabular-nums">{formatDate(c.courtesyActualReturnDate!)}</span>
                          }
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">
                            {formatDuration(
                              c.courtesyStartDate ?? "",
                              c.courtesyActualReturnDate ?? undefined,
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {cActive
                            ? <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">פעיל</span>
                            : <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">הוחזר</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-amber-600 max-w-[140px] truncate">
                          {c.courtesyReason ? COURTESY_REASON_LABELS[c.courtesyReason] : "—"}
                        </td>
                        <td className="px-4 py-2.5" />
                      </tr>
                    );
                  })}
                </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">לא נמצאו רשומות היסטוריה</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {driverFilter && (() => {
        const d = drivers.find(x => x.id === driverFilter);
        const vehicles_driven = [...new Set(filtered.map(l => l.vehicleId))];
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
              <div><div className="text-2xl font-bold text-[#ecad0a]">{filtered.length}</div><div className="text-xs text-white/50 mt-0.5">שיבוצים כולל</div></div>
              <div><div className="text-2xl font-bold text-[#ecad0a]">{vehicles_driven.length}</div><div className="text-xs text-white/50 mt-0.5">רכבים שונים</div></div>
              <div><div className="text-2xl font-bold text-[#ecad0a]">{filtered.filter(l => !l.endDate).length > 0 ? "כן" : "לא"}</div><div className="text-xs text-white/50 mt-0.5">שיבוץ פעיל</div></div>
            </div>
          </div>
        );
      })()}

      {vehicleFilter && (() => {
        const v = vehicles.find(x => x.id === vehicleFilter);
        const uniqueDrivers = [...new Set(filtered.map(l => l.driverId))];
        return (
          <div className="bg-[#032147] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ecad0a] flex items-center justify-center">
                <Car size={18} className="text-[#032147]" />
              </div>
              <div>
                <p className="font-bold text-base">{v?.manufacturer} {v?.model}<span className="font-mono text-sm text-white/50 mr-2">({v?.licensePlate})</span></p>
                <p className="text-xs text-white/50">פרופיל שיבוץ רכב</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold text-[#ecad0a]">{filtered.length}</div><div className="text-xs text-white/50 mt-0.5">שיבוצים כולל</div></div>
              <div><div className="text-2xl font-bold text-[#ecad0a]">{uniqueDrivers.length}</div><div className="text-xs text-white/50 mt-0.5">נהגים שונים</div></div>
              <div><div className="text-2xl font-bold text-[#ecad0a]">{filtered.filter(l => !l.endDate).length}</div><div className="text-xs text-white/50 mt-0.5">נהגים פעילים כעת</div></div>
            </div>
          </div>
        );
      })()}

      <ConfirmDialog
        open={!!endingLog}
        onClose={() => setEndingLog(null)}
        onConfirm={async () => {
          if (endingLog) {
            await unassignDriverFromVehicle(endingLog.driverId, endingLog.vehicleId);
            setEndingLog(null);
          }
        }}
        title="סיום שיבוץ"
        description={`האם לסיים את השיבוץ הפעיל של ${drivers.find(d => d.id === endingLog?.driverId)?.fullName ?? "הנהג"}? תאריך הסיום יירשם עכשיו.`}
        confirmLabel="סיים שיבוץ"
        danger
      />
    </div>
  );
}
