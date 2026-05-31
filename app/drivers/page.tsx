"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Plus, Eye, Trash2, Search, Car, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { Driver } from "@/types";

function DriverForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Driver>;
  onSave: (d: Omit<Driver, "id" | "fullName" | "assignedVehicleIds" | "accidentIds" | "documentIds">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    firstName:           initial?.firstName           ?? "",
    lastName:            initial?.lastName            ?? "",
    uniqueId:            initial?.uniqueId            ?? "",
    dateOfBirth:         initial?.dateOfBirth         ?? "",
    driverLicenseNumber: initial?.driverLicenseNumber ?? "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: typeof errors = {};
    if (!form.firstName.trim())           err.firstName           = "שדה חובה";
    if (!form.lastName.trim())            err.lastName            = "שדה חובה";
    if (!form.uniqueId.trim())            err.uniqueId            = "שדה חובה";
    if (!form.driverLicenseNumber.trim()) err.driverLicenseNumber = "שדה חובה";
    setErrors(err);
    if (Object.keys(err).length > 0) return;
    onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="שם פרטי"
          value={form.firstName}
          onChange={e => set("firstName", e.target.value)}
          error={errors.firstName}
          placeholder="שם פרטי"
        />
        <Input
          label="שם משפחה"
          value={form.lastName}
          onChange={e => set("lastName", e.target.value)}
          error={errors.lastName}
          placeholder="שם משפחה"
        />
      </div>
      <Input
        label="מספר תעודת זהות"
        value={form.uniqueId}
        onChange={e => set("uniqueId", e.target.value)}
        error={errors.uniqueId}
        placeholder="000000000"
      />
      <Input
        label="תאריך לידה"
        type="date"
        value={form.dateOfBirth}
        onChange={e => set("dateOfBirth", e.target.value)}
      />
      <Input
        label="מספר רישיון נהיגה"
        value={form.driverLicenseNumber}
        onChange={e => set("driverLicenseNumber", e.target.value)}
        error={errors.driverLicenseNumber}
        placeholder="0000000"
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} type="button">ביטול</Button>
        <Button type="submit">שמור נהג</Button>
      </div>
    </form>
  );
}

// Avatar initials
function Avatar({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : name.slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-xl bg-[#032147]/10 flex items-center justify-center text-[#032147] font-bold text-xs shrink-0">
      {initials}
    </div>
  );
}

export default function DriversPage() {
  const { drivers, vehicles, addDriver, deleteDriver } = useStore();
  const [search, setSearch]           = useState("");
  const [showAdd, setShowAdd]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  const filtered = drivers.filter(d => {
    const q = search.toLowerCase();
    return [d.fullName, d.firstName, d.lastName, d.uniqueId, d.driverLicenseNumber]
      .join(" ").toLowerCase().includes(q);
  });

  const getAffectedVehicles = (d: Driver) =>
    vehicles.filter(v => v.mainDriverId === d.id || v.secondaryDriverIds.includes(d.id));

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">נהגים</h1>
          <p className="text-sm text-gray-500 mt-0.5">{drivers.length} נהגים רשומים במערכת</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={15} /> הוסף נהג
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className="w-full pl-9 pr-4 h-9 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all"
          placeholder="חיפוש נהגים..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-[#f8fafc]">
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">נהג</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">ת.ז</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">רישיון</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">רכבים</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">תאונות</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(d => {
              const assigned = vehicles.filter(
                v => v.mainDriverId === d.id || v.secondaryDriverIds.includes(d.id)
              );
              return (
                <tr key={d.id} className="hover:bg-[#f8fafc] transition-colors group">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={d.fullName} />
                      <div>
                        <div className="font-semibold text-[#032147] text-sm">{d.fullName}</div>
                        {d.dateOfBirth && (
                          <div className="text-xs text-gray-400">נולד: {d.dateOfBirth}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* ID */}
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 tabular-nums">
                    {d.uniqueId}
                  </td>

                  {/* License */}
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {d.driverLicenseNumber}
                  </td>

                  {/* Vehicles */}
                  <td className="px-4 py-3">
                    {assigned.length === 0 ? (
                      <span className="text-xs text-gray-400">ללא שיבוץ</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {assigned.map(v => (
                          <div key={v.id} className="flex items-center gap-1.5">
                            <Car size={11} className="text-[#209dd7] shrink-0" />
                            <span className="text-xs text-gray-600">
                              {v.manufacturer} {v.model}
                              <span className="text-gray-400"> ({v.licensePlate})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Accidents */}
                  <td className="px-4 py-3">
                    {d.accidentIds.length > 0 ? (
                      <Badge variant="danger" dot>
                        {d.accidentIds.length} תאונ{d.accidentIds.length > 1 ? "ות" : "ה"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400">ללא</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/drivers/${d.id}`}>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors">
                          <Eye size={14} />
                        </button>
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(d)}
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
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                  לא נמצאו נהגים
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="הוספת נהג חדש">
        <DriverForm
          onSave={data => {
            addDriver({ ...data, assignedVehicleIds: [], accidentIds: [], documentIds: [] });
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Dialog>

      {/* Delete dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteDriver(deleteTarget.id); }}
        title="מחיקת נהג"
        description={`האם למחוק את ${deleteTarget?.fullName}?${
          deleteTarget && getAffectedVehicles(deleteTarget).length > 0
            ? ` שיבוץ ב-${getAffectedVehicles(deleteTarget).map(v => v.licensePlate).join(", ")} יוסר. `
            : " "
        }פעולה זו אינה ניתנת לביטול.`}
        confirmLabel="מחק נהג"
        danger
      />
    </div>
  );
}
