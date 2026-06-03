"use client";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  Car, Users, Wrench, AlertTriangle, FileText,
  TrendingUp, ArrowRight, Bell, Shield, Calendar,
} from "lucide-react";
import Link from "next/link";

// ── Stat card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  accent: string; // tailwind bg color class for icon bg, e.g. "bg-sky-50 text-sky-600"
}) {
  const [bg, text] = accent.split(" ");
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} ${text} flex items-center justify-center shrink-0`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-[#032147] leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
        {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Mini bar (used inside insight cards) ─────────────────────────────────────
function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const {
    vehicles, drivers, serviceRecords, accidentCards,
    documents, vehicleStatuses, fuelTypes,
    vehicleInsurances, insuranceTypes, insuranceCompanies,
    dismissedAlertKeys,
  } = useStore();

  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  // Alerts: expiring license or insurance within 30 days (for vehicles with alerts enabled, excluding dismissed)
  const expiringLicenses = vehicles.filter(v =>
    v.alertsEnabled !== false && v.licenseExpiry && v.licenseExpiry <= in30 &&
    !dismissedAlertKeys.has(`license_${v.id}`)
  );
  const expiringInsurances = vehicleInsurances.filter(ins => {
    const v = vehicles.find(x => x.id === ins.vehicleId);
    return v?.alertsEnabled !== false && ins.endDate <= in30 &&
      !dismissedAlertKeys.has(`insurance_${ins.id}`);
  });
  const totalAlerts = expiringLicenses.length + expiringInsurances.length;

  const openAccidents  = accidentCards.filter(a => a.status !== "closed").length;
  // Count per status — dynamic, covers all statuses
  const statusCounts = [...vehicleStatuses]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(s => ({ ...s, count: vehicles.filter(v => v.statusId === s.id).length }));
  const defaultStatus = vehicleStatuses.find(s => s.isDefault);
  // רכבים תפעוליים = סטטוסים המסומנים כ-isOperational (זמין + בשימוש)
  // fallback לשמות ברירת מחדל אם isOperational לא הוגדר (נתונים ישנים)
  const operationalStatuses = vehicleStatuses.filter(s =>
    s.isOperational === true ||
    (s.isOperational === undefined && (s.name === "זמין" || s.name === "בשימוש"))
  );
  const operationalIds = new Set(operationalStatuses.map(s => s.id));
  const activeCount = vehicles.filter(v => operationalIds.has(v.statusId)).length;
  const companyOwned   = vehicles.filter(v => v.ownershipType === "company_owned").length;
  const leasing        = vehicles.filter(v => v.ownershipType === "leasing").length;
  const fuelSplit      = fuelTypes.map(ft => ({
    name: ft.name,
    count: vehicles.filter(v => v.fuelTypeId === ft.id).length,
  }));

  const recentServices  = [...serviceRecords]
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)).slice(0, 5);
  const recentAccidents = [...accidentCards]
    .sort((a, b) => b.accidentDate.localeCompare(a.accidentDate)).slice(0, 5);

  const accidentBadge = (status: string): { label: string; variant: "danger" | "warning" | "blue" | "gray" } => ({
    new_report:          { label: "דיווח חדש",      variant: "danger" },
    under_review:        { label: "בבדיקה",          variant: "warning" },
    sent_to_insurance:   { label: "הועבר לביטוח",   variant: "blue" },
    in_repair:           { label: "בתיקון",           variant: "warning" },
    closed:              { label: "סגור",             variant: "gray" },
  } as const)[status as keyof object] ?? { label: status, variant: "gray" };

  const totalCost = serviceRecords.reduce((s, r) => s + r.cost, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Alerts banner ────────────────────────────────────────────────── */}
      {totalAlerts > 0 && (
        <Link href="/alerts">
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 cursor-pointer hover:bg-amber-100 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Bell size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">
                {totalAlerts} התראות פעילות — ביטוחים ורישויים מתקרבים לפקיעה
              </p>
              <p className="text-xs text-amber-700 mt-0.5 flex gap-3 flex-wrap">
                {expiringLicenses.length > 0 && (
                  <span className="flex items-center gap-1"><Calendar size={11} /> {expiringLicenses.length} רישויים</span>
                )}
                {expiringInsurances.length > 0 && (
                  <span className="flex items-center gap-1"><Shield size={11} /> {expiringInsurances.length} ביטוחים</span>
                )}
              </p>
            </div>
            <ArrowRight size={16} className="text-amber-600 shrink-0" />
          </div>
        </Link>
      )}

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">דשבורד</h1>
          <p className="text-sm text-gray-500 mt-0.5">סקירה תפעולית — צי רכבים</p>
        </div>
        <Link
          href="/board"
          className="flex items-center gap-1.5 text-xs font-medium text-[#209dd7] hover:text-[#1880b0] transition-colors"
        >
          לוח רכבים <ArrowRight size={13} />
        </Link>
      </div>

      {/* ── Fleet health strip ──────────────────────────────────────────── */}
      <div className="bg-[#032147] rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">בריאות הצי</p>
            <p className="text-sm text-white/80">
              {activeCount} מתוך {vehicles.length} רכבים זמינים תפעולית
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#ecad0a]">
              {vehicles.length > 0 ? Math.round((activeCount / vehicles.length) * 100) : 0}%
            </div>
            <div className="text-[11px] text-white/40">זמינות</div>
          </div>
        </div>
        {/* Stacked status bar */}
        <div className="flex h-2.5 rounded-full overflow-hidden gap-[2px]">
          {[...vehicleStatuses]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(s => {
              const count = vehicles.filter(v => v.statusId === s.id).length;
              const pct   = vehicles.length > 0 ? (count / vehicles.length) * 100 : 0;
              return pct > 0 ? (
                <div
                  key={s.id}
                  style={{ width: `${pct}%`, backgroundColor: s.color }}
                  className="rounded-full"
                  title={`${s.name}: ${count}`}
                />
              ) : null;
            })}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3">
          {[...vehicleStatuses]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(s => {
              const count = vehicles.filter(v => v.statusId === s.id).length;
              return (
                <div key={s.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] text-white/55">{s.name}</span>
                  <span className="text-[11px] font-semibold text-white/80">{count}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="סה&quot;כ רכבים"   value={vehicles.length}       icon={Car}           accent="bg-sky-50 text-sky-600"     sub={`${companyOwned} בבעלות · ${leasing} ליסינג`} />
        {statusCounts.map(s => (
          <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: s.color + "22" }}>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-[#032147] leading-none">{s.count}</div>
              <div className="text-xs text-gray-500 mt-1 font-medium">{s.name}</div>
            </div>
          </div>
        ))}
        <KpiCard label="תאונות פתוחות"      value={openAccidents}         icon={AlertTriangle} accent="bg-red-50 text-red-600" />
        <KpiCard label="סה&quot;כ נהגים"    value={drivers.length}        icon={Users}         accent="bg-indigo-50 text-indigo-600" />
        <KpiCard label="רשומות טיפול"       value={serviceRecords.length} icon={Wrench}        accent="bg-teal-50 text-teal-600"   sub={formatCurrency(totalCost) + " סה\"כ"} />
        <KpiCard label="מסמכים"             value={documents.length}      icon={FileText}      accent="bg-gray-100 text-gray-500" />
      </div>

      {/* ── Analytics row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Ownership */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">פילוח בעלות</p>
          <div className="space-y-3">
            {[
              { label: "בבעלות החברה", count: companyOwned, color: "#209dd7" },
              { label: "ליסינג",        count: leasing,       color: "#753991" },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className="text-sm font-bold text-[#032147]">{count}</span>
                </div>
                <MiniBar
                  pct={vehicles.length > 0 ? (count / vehicles.length) * 100 : 0}
                  color={color}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Fuel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">פילוח סוג דלק</p>
          <div className="space-y-3">
            {fuelSplit.map(({ name, count }) => (
              <div key={name}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-gray-600">{name}</span>
                  <span className="text-sm font-bold text-[#032147]">{count}</span>
                </div>
                <MiniBar
                  pct={vehicles.length > 0 ? (count / vehicles.length) * 100 : 0}
                  color="#ecad0a"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">ניווט מהיר</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/vehicles",   label: "רכבים",         icon: Car,           bg: "bg-sky-50",     text: "text-sky-700" },
              { href: "/drivers",    label: "נהגים",         icon: Users,          bg: "bg-indigo-50",  text: "text-indigo-700" },
              { href: "/services",   label: "טיפולים",       icon: Wrench,         bg: "bg-amber-50",   text: "text-amber-700" },
              { href: "/accidents",  label: "תאונות",        icon: AlertTriangle,  bg: "bg-red-50",     text: "text-red-700" },
              { href: "/documents",  label: "מסמכים",        icon: FileText,       bg: "bg-gray-100",   text: "text-gray-700" },
              { href: "/assignment", label: "שיבוץ",         icon: TrendingUp,     bg: "bg-violet-50",  text: "text-violet-700" },
            ].map(({ href, label, icon: Icon, bg, text }) => (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${bg} hover:opacity-80 transition-opacity`}
              >
                <Icon size={16} className={text} />
                <span className={`text-[11px] font-semibold ${text}`}>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Activity ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Recent services */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center">
                <Wrench size={13} className="text-amber-600" />
              </div>
              <p className="text-sm font-semibold text-[#032147]">טיפולים אחרונים</p>
            </div>
            <Link href="/services" className="text-xs text-[#209dd7] hover:underline font-medium">
              הצג הכל
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentServices.map(sr => {
              const vehicle = vehicles.find(v => v.id === sr.vehicleId);
              return (
                <div key={sr.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#f8fafc] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{sr.serviceType}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {vehicle ? `${vehicle.manufacturer} ${vehicle.model} · ${vehicle.licensePlate}` : "רכב לא ידוע"}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(sr.serviceDate)} · {sr.providerName}</p>
                  </div>
                  <span className="text-sm font-bold text-[#032147] whitespace-nowrap shrink-0">
                    {formatCurrency(sr.cost)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent accidents */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={13} className="text-red-600" />
              </div>
              <p className="text-sm font-semibold text-[#032147]">דוחות תאונה אחרונים</p>
            </div>
            <Link href="/accidents" className="text-xs text-[#209dd7] hover:underline font-medium">
              הצג הכל
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentAccidents.map(a => {
              const driver  = drivers.find(d => d.id === a.driverId);
              const vehicle = vehicles.find(v => v.id === a.vehicleId);
              const { label, variant } = accidentBadge(a.status);
              return (
                <div key={a.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#f8fafc] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.shortDescription}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {driver?.fullName ?? "נהג לא ידוע"}
                      {vehicle ? ` · ${vehicle.licensePlate}` : ""}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(a.accidentDate)} · {a.location}</p>
                  </div>
                  <Badge variant={variant} dot>{label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
