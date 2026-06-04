"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Edit, Search, Wrench } from "lucide-react";
import type { ServiceRecord } from "@/types";

const SERVICE_TYPES = [
  "טיפול תקופתי", "החלפת צמיגים", "טיפול בבלמים", "החלפת סוללה",
  "הכנה לטסט שנתי", "טסט שנתי", "תיקון", "אחר",
];

function ServiceForm({ initial, onSave, onCancel }: {
  initial?: Partial<ServiceRecord>;
  onSave: (s: Omit<ServiceRecord, "id" | "documentIds">) => void;
  onCancel: () => void;
}) {
  const { vehicles } = useStore();
  const [form, setForm] = useState({
    vehicleId:                  initial?.vehicleId                  ?? "",
    serviceDate:                initial?.serviceDate                ?? new Date().toISOString().slice(0, 10),
    serviceType:                initial?.serviceType                ?? SERVICE_TYPES[0],
    providerName:               initial?.providerName               ?? "",
    mileage:                    initial?.mileage                    ?? 0,
    description:                initial?.description                ?? "",
    cost:                       initial?.cost                       ?? 0,
    nextRecommendedServiceDate: initial?.nextRecommendedServiceDate ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  function set(k: keyof typeof form, v: string | number) { setForm(f => ({ ...f, [k]: v })); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: typeof errors = {};
    if (!form.vehicleId)            err.vehicleId    = "שדה חובה";
    if (!form.providerName.trim())  err.providerName = "שדה חובה";
    setErrors(err);
    if (Object.keys(err).length > 0) return;
    onSave({ ...form, mileage: Number(form.mileage), cost: Number(form.cost) });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Select label="רכב" value={form.vehicleId} onChange={e => set("vehicleId", e.target.value)} error={errors.vehicleId}>
        <option value="">בחר רכב...</option>
        {vehicles.map(v => (
          <option key={v.id} value={v.id}>{v.manufacturer} {v.model} ({v.licensePlate})</option>
        ))}
      </Select>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="תאריך טיפול" type="date" value={form.serviceDate} onChange={e => set("serviceDate", e.target.value)} />
        <Select label="סוג טיפול" value={form.serviceType} onChange={e => set("serviceType", e.target.value)}>
          {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
      </div>
      <Input label="ספק / מוסך" value={form.providerName} onChange={e => set("providerName", e.target.value)} error={errors.providerName} placeholder="שם המוסך או הספק" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label='ק"מ בעת הטיפול' type="number" value={form.mileage} onChange={e => set("mileage", e.target.value)} />
        <Input label="עלות (₪)" type="number" value={form.cost} onChange={e => set("cost", e.target.value)} />
      </div>
      <Textarea label="תיאור" value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="פרטים נוספים על הטיפול..." />
      <Input label="תאריך טיפול מומלץ הבא" type="date" value={form.nextRecommendedServiceDate} onChange={e => set("nextRecommendedServiceDate", e.target.value)} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} type="button">ביטול</Button>
        <Button type="submit">שמור רשומה</Button>
      </div>
    </form>
  );
}

export default function ServicesPage() {
  const { serviceRecords, vehicles, addServiceRecord, updateServiceRecord, deleteServiceRecord } = useStore();
  const [search, setSearch]             = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [showAdd, setShowAdd]           = useState(false);
  const [editTarget, setEditTarget]     = useState<ServiceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = serviceRecords.filter(sr => {
    const vehicle = vehicles.find(v => v.id === sr.vehicleId);
    if (vehicleFilter && sr.vehicleId !== vehicleFilter) return false;
    const q = search.toLowerCase();
    return [sr.serviceType, sr.providerName, vehicle?.licensePlate, vehicle?.manufacturer, vehicle?.model]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
  }).sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));

  const totalCost = filtered.reduce((s, r) => s + r.cost, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">רשומות טיפול</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {serviceRecords.length} רשומות · סה"כ {formatCurrency(totalCost)}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={15} /> הוסף טיפול
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative w-full sm:w-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full pl-9 pr-4 h-9 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all"
            placeholder="חיפוש..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} className="max-w-xs">
          <option value="">כל הרכבים</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>{v.manufacturer} {v.model} ({v.licensePlate})</option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm min-w-[650px]">
          <thead className="sticky top-0 z-10 bg-[#f8fafc] shadow-[0_1px_0_rgb(0_0_0/0.04)]">
            <tr className="border-b border-gray-50 bg-[#f8fafc]">
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">רכב</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">סוג טיפול</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">תאריך</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">ספק</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">ק"מ</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">עלות</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">טיפול הבא</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(sr => {
              const vehicle = vehicles.find(v => v.id === sr.vehicleId);
              return (
                <tr key={sr.id} className="hover:bg-[#f8fafc] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#032147] text-sm">
                      {vehicle ? `${vehicle.manufacturer} ${vehicle.model}` : "רכב לא ידוע"}
                    </div>
                    <div className="text-xs font-mono text-gray-400">{vehicle?.licensePlate}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Wrench size={12} className="text-amber-500 shrink-0" />
                      <span className="text-sm text-gray-700">{sr.serviceType}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(sr.serviceDate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{sr.providerName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">{sr.mileage.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-[#032147] text-sm">{formatCurrency(sr.cost)}</td>
                  <td className="px-4 py-3 text-xs text-[#209dd7]">
                    {sr.nextRecommendedServiceDate ? formatDate(sr.nextRecommendedServiceDate) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditTarget(sr)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(sr.id)}
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
                  לא נמצאו רשומות טיפול
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="הוספת רשומת טיפול" size="lg">
        <ServiceForm
          onSave={d => { addServiceRecord({ ...d, documentIds: [] }); setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      </Dialog>

      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} title="עריכת רשומת טיפול" size="lg">
        {editTarget && (
          <ServiceForm
            initial={editTarget}
            onSave={d => { updateServiceRecord(editTarget.id, d); setEditTarget(null); }}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteServiceRecord(deleteTarget); }}
        title="מחיקת רשומת טיפול"
        description="רשומת הטיפול תימחק לצמיתות. פעולה זו אינה ניתנת לביטול."
        confirmLabel="מחק רשומה"
        danger
      />
    </div>
  );
}
