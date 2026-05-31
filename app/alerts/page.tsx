"use client";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { Shield, Calendar, AlertTriangle, Car, CheckCircle2 } from "lucide-react";
import Link from "next/link";

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 864e5);
}

function UrgencyBadge({ days }: { days: number }) {
  if (days < 0)  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">פג תוקף לפני {Math.abs(days)} ימים</span>;
  if (days === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">פג היום!</span>;
  if (days <= 7)  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{days} ימים</span>;
  if (days <= 30) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{days} ימים</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{days} ימים</span>;
}

export default function AlertsPage() {
  const { vehicles, vehicleInsurances, insuranceTypes, insuranceCompanies } = useStore();

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);

  // Vehicles with alertsEnabled + expiring license (within 60 days or expired)
  const licenseAlerts = useMemo(() =>
    vehicles
      .filter(v => v.alertsEnabled !== false && v.licenseExpiry && v.licenseExpiry <= in60)
      .map(v => ({ vehicle: v, days: daysUntil(v.licenseExpiry!) }))
      .sort((a, b) => a.days - b.days),
    [vehicles, in60]
  );

  // Insurance expiring within 60 days or expired — only for vehicles with alertsEnabled
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
      }))
      .filter(x => x.vehicle)
      .sort((a, b) => a.days - b.days),
    [vehicleInsurances, vehicles, insuranceTypes, insuranceCompanies, in60]
  );

  const totalAlerts = licenseAlerts.length + insuranceAlerts.length;

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
            {totalAlerts === 0 ? "אין התראות פעילות" : `${totalAlerts} התראות — ביטוחים ורישויים מתקרבים לפקיעה`}
          </p>
        </div>
      </div>

      {totalAlerts === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
          <p className="text-gray-500 font-medium">כל הביטוחים והרישויים בתוקף</p>
          <p className="text-sm text-gray-400 mt-1">אין פקיעות צפויות ב-60 הימים הקרובים</p>
        </div>
      )}

      {/* License alerts */}
      {licenseAlerts.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} className="text-[#032147]" />
            <h2 className="text-sm font-bold text-[#032147] uppercase tracking-wide">טסט רישוי</h2>
            <span className="text-xs bg-[#032147]/10 text-[#032147] px-2 py-0.5 rounded-full font-semibold">{licenseAlerts.length}</span>
          </div>
          {licenseAlerts.map(({ vehicle, days }) => (
            <Link key={vehicle.id} href={`/vehicles/${vehicle.id}`}>
              <div className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all ${
                days < 0 ? "bg-red-50 border-red-200" :
                days <= 7 ? "bg-red-50 border-red-200" :
                days <= 30 ? "bg-amber-50 border-amber-200" :
                "bg-white border-gray-100 shadow-sm"
              }`}>
                <div className="w-10 h-10 rounded-xl bg-[#032147]/10 flex items-center justify-center shrink-0">
                  <Car size={16} className="text-[#032147]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#032147] text-sm">{vehicle.manufacturer} {vehicle.model}</div>
                  <div className="text-xs text-gray-500 mt-0.5">לוחית: {vehicle.licensePlate} · טסט: {formatDate(vehicle.licenseExpiry!)}</div>
                </div>
                <UrgencyBadge days={days} />
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* Insurance alerts */}
      {insuranceAlerts.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={15} className="text-[#032147]" />
            <h2 className="text-sm font-bold text-[#032147] uppercase tracking-wide">ביטוחים</h2>
            <span className="text-xs bg-[#032147]/10 text-[#032147] px-2 py-0.5 rounded-full font-semibold">{insuranceAlerts.length}</span>
          </div>
          {insuranceAlerts.map(({ ins, vehicle, insType, insCompany, days }) => (
            <Link key={ins.id} href={`/vehicles/${vehicle.id}`}>
              <div className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all ${
                days < 0 ? "bg-red-50 border-red-200" :
                days <= 7 ? "bg-red-50 border-red-200" :
                days <= 30 ? "bg-amber-50 border-amber-200" :
                "bg-white border-gray-100 shadow-sm"
              }`}>
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
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
