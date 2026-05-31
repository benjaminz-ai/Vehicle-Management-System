"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { VehicleForm } from "@/components/VehicleForm";
import { Plus, Trash2, Eye, Search } from "lucide-react";
import Link from "next/link";
import type { Vehicle } from "@/types";

export default function VehiclesPage() {
  const { vehicles, drivers, vehicleStatuses, vehicleTypes, fuelTypes, addVehicle, deleteVehicle } = useStore();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    const status = vehicleStatuses.find(s => s.id === v.statusId);
    const vtype  = vehicleTypes.find(t => t.id === v.vehicleTypeId);
    const ftype  = fuelTypes.find(f => f.id === v.fuelTypeId);
    return [v.licensePlate, v.manufacturer, v.model, String(v.year), status?.name, vtype?.name, ftype?.name, v.leasingCompanyName]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  const statusVariant = (name: string): "success" | "warning" | "danger" | "purple" | "gray" => {
    if (name === "פעיל")             return "success";
    if (name === "בטיפול")           return "warning";
    if (name.includes("תאונה"))      return "danger";
    if (name.includes("ממתין"))      return "purple";
    return "gray";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">רכבים</h1>
          <p className="text-sm text-gray-500 mt-0.5">{vehicles.length} רכבים בצי</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={15} /> הוסף רכב
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className="w-full pl-9 pr-4 h-9 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all"
          placeholder="חיפוש רכבים..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-[#f8fafc]">
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">רכב</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">לוחית</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">סוג / דלק</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">נהג/ים</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">בעלות</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">סטטוס</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">ק"מ</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(v => {
              const mainDriver   = drivers.find(d => d.id === v.mainDriverId);
              const secondDriver = v.secondaryDriverIds?.[0] ? drivers.find(d => d.id === v.secondaryDriverIds[0]) : null;
              const status = vehicleStatuses.find(s => s.id === v.statusId);
              const vtype  = vehicleTypes.find(t => t.id === v.vehicleTypeId);
              const ftype  = fuelTypes.find(f => f.id === v.fuelTypeId);
              return (
                <tr key={v.id} className="hover:bg-[#f8fafc] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#032147]">{v.manufacturer} {v.model}</div>
                    <div className="text-xs text-gray-400">{v.year}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                      {v.licensePlate}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">{vtype?.name}</div>
                    <div className="text-xs text-gray-400">{ftype?.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">{mainDriver?.fullName ?? "—"}</div>
                    {secondDriver && <div className="text-xs text-gray-400">{secondDriver.fullName}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">
                      {v.ownershipType === "company_owned" ? "בעלות החברה" : "ליסינג"}
                    </div>
                    {v.leasingCompanyName && (
                      <div className="text-xs text-gray-400">{v.leasingCompanyName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {status && (
                      <Badge variant={statusVariant(status.name)} dot>
                        {status.name}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">
                    {v.mileage.toLocaleString()} km
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/vehicles/${v.id}`}>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors">
                          <Eye size={14} />
                        </button>
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(v)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                  לא נמצאו רכבים
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="הוספת רכב" size="lg">
        <VehicleForm
          onSave={data => {
            addVehicle({ ...data, serviceRecordIds: [], accidentIds: [], documentIds: [] });
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteVehicle(deleteTarget.id); }}
        title="מחיקת רכב"
        description={`האם למחוק את ${deleteTarget?.manufacturer} ${deleteTarget?.model} (${deleteTarget?.licensePlate})? רשומות הטיפול והמסמכים הקשורים יוסרו גם כן. פעולה זו אינה ניתנת לביטול.`}
        confirmLabel="מחק רכב"
        danger
      />
    </div>
  );
}
