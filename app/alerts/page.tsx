"use client";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { Shield, Calendar, AlertTriangle, Car, CheckCircle2, X, RotateCcw } from "lucide-react";
import Link from "next/link";

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 864e5);
}

function UrgencyBadge({ days }: { days: number }) {
  if (days < 0)   return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">פג לפני {Math.abs(days)} ימים</span>;
  if (days === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">פג היום!</span>;
  if (days <= 7)  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{days} ימים</span>;
  if (days <= 30) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{days} ימים</span>;
  return           <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{days} ימים</span>;
}

export default function AlertsPage() {
  const {
    vehicles, vehicleInsurances, insuranceTypes, insuranceCompanies,
    dismissAlert, undismissAlert, dismissedAlertKeys,
  } = useStore();

  const in60 = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);

  // License alerts
  const licenseAlerts = useMemo(() =>
    vehicles
      .filter(v => v.alertsEnabled !== false && v.licenseExpiry && v.licenseExpiry <= in60)
      .map(v => ({
        vehicle: v,
        days: daysUntil(v.licenseExpiry!),
        key: `license_${v.id}`,
      }))
      .sort((a, b) => a.days - b.days),
    [vehicles, in60]
  );

  // Insurance alerts
  const insuranceAlerts = useMemo(() =>
    vehicleInsurances
      .filter(ins => {
        const v = vehicles.find(x => x.id === ins.vehicleId);
        return v?.alertsEnabled !== false && ins.endDate <= in60;
      })
      .map(ins => ({
        ins,
        vehicle: vehicles.find(x => x.id === ins.vehicleId)!,
        insType: insuranceTypes.find(t => t.id === ins.insuranceTypeId),
        insCompany: insuranceCompanies.find(c => c.id === ins.insuranceCompanyId),
        days: daysUntil(ins.endDate),
        key: `insurance_${ins.id}`,
      }))
      .filter(x => x.vehicle)
      .sort((a, b) => a.days - b.days),
    [vehicleInsurances, vehicles, insuranceTypes, insuranceCompanies, in60]
  );

  const activeLicense   = licenseAlerts.filter(a => !dismissedAlertKeys.has(a.key));
  const activeInsurance = insuranceAlerts.filter(a => !dismissedAlertKeys.has(a.key));
  const dismissedLicense   = licenseAlerts.filter(a => dismissedAlertKeys.has(a.key));
  const dismissedInsurance = insuranceAlerts.filter(a => dismissedAlertKeys.has(a.key));

  const totalActive = activeLicense.length + activeInsurance.length;
  const totalDismissed = dismissedLicense.length + dismissedInsurance.length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
          <AlertTriangle size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">התראות</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalActive === 0
              ? totalDismissed > 0 ? `${totalDismissed} התראות מסומנות כטופלו` : "אין התראות פעילות"
              : `${totalActive} התראות פעילות — ביטוחים ורישויים מתקרבים לפקיעה`}
          </p>
        </div>
      </div>

      {/* All clear */}
      {totalActive === 0 && totalDismissed === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
          <p className="text-gray-500 font-medium">כל הביטוחים והרישויים בתוקף</p>
          <p className="text-sm text-gray-400 mt-1">אין פקיעות צפויות ב-60 הימים הקרובים</p>
        </div>
      )}

      {/* Active license alerts */}
      {activeLicense.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} className="text-[#032147]" />
            <h2 className="text-sm font-bold text-[#032147] uppercase tracking-wide">טסט רישוי</h2>
            <span className="text-xs bg-[#032147]/10 text-[#032147] px-2 py-0.5 rounded-full font-semibold">{activeLicense.length}</span>
          </div>
          {activeLicense.map(({ vehicle, days, key }) => (
            <div key={key} className={`flex items-center gap-4 p-4 rounded-2xl border ${
              days <= 7 ? "bg-red-50 border-red-200" :
              days <= 30 ? "bg-amber-50 border-amber-200" :
              "bg-white border-gray-100 shadow-sm"
            }`}>
              <Link href={`/vehicles/${vehicle.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#032147]/10 flex items-center justify-center shrink-0">
                  <Car size={16} className="text-[#032147]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#032147] text-sm">{vehicle.manufacturer} {vehicle.model}</div>
                  <div className="text-xs text-gray-500 mt-0.5">לוחית: {vehicle.licensePlate} · טסט: {formatDate(vehicle.licenseExpiry!)}</div>
                </div>
                <UrgencyBadge days={days} />
              </Link>
              <button
                onClick={() => dismissAlert(key)}
                title="סמן כטופל"
                className="shrink-0 w-8 h-8 rounded-xl hover:bg-emerald-100 flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Active insurance alerts */}
      {activeInsurance.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={15} className="text-[#032147]" />
            <h2 className="text-sm font-bold text-[#032147] uppercase tracking-wide">ביטוחים</h2>
            <span className="text-xs bg-[#032147]/10 text-[#032147] px-2 py-0.5 rounded-full font-semibold">{activeInsurance.length}</span>
          </div>
          {activeInsurance.map(({ ins, vehicle, insType, insCompany, days, key }) => (
            <div key={key} className={`flex items-center gap-4 p-4 rounded-2xl border ${
              days <= 7 ? "bg-red-50 border-red-200" :
              days <= 30 ? "bg-amber-50 border-amber-200" :
              "bg-white border-gray-100 shadow-sm"
            }`}>
              <Link href={`/vehicles/${vehicle.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#209dd7]/10 flex items-center justify-center shrink-0">
                  <Shield size={16} className="text-[#209dd7]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#032147] text-sm">
                    {insType?.name ?? "ביטוח"} — {vehicle.manufacturer} {vehicle.model}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {insCompany?.name && <span>{insCompany.name} · </span>}
                    {vehicle.licensePlate} · פג: {formatDate(ins.endDate)}
                  </div>
                </div>
                <UrgencyBadge days={days} />
              </Link>
              <button
                onClick={() => dismissAlert(key)}
                title="סמן כטופל"
                className="shrink-0 w-8 h-8 rounded-xl hover:bg-emerald-100 flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Dismissed section */}
      {totalDismissed > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">סומנו כטופלו ({totalDismissed})</h2>
            <span className="text-xs text-gray-400">· חוזרות אוטומטית תוך 30 יום</span>
          </div>
          {[...dismissedLicense.map(a => ({ ...a, type: "license" as const })),
            ...dismissedInsurance.map(a => ({ ...a, type: "insurance" as const }))
          ].map(item => (
            <div key={item.key} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border border-gray-100 opacity-60">
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                {item.type === "license"
                  ? <Calendar size={14} className="text-gray-400" />
                  : <Shield size={14} className="text-gray-400" />
                }
              </div>
              <div className="flex-1 min-w-0 text-xs text-gray-500">
                {item.type === "license"
                  ? `טסט רישוי — ${item.vehicle.manufacturer} ${item.vehicle.model} (${item.vehicle.licensePlate})`
                  : `${(item as any).insType?.name ?? "ביטוח"} — ${item.vehicle.manufacturer} ${item.vehicle.model} (${item.vehicle.licensePlate})`
                }
              </div>
              <button
                onClick={() => undismissAlert(item.key)}
                title="בטל סימון"
                className="shrink-0 w-8 h-8 rounded-xl hover:bg-amber-100 flex items-center justify-center text-gray-300 hover:text-amber-600 transition-colors"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
