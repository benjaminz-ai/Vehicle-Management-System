"use client";
import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Plus, Eye, Trash2, Search, Car, ChevronDown, X, SlidersHorizontal, UserCheck } from "lucide-react";
import Link from "next/link";
import type { Driver } from "@/types";

function DriverForm({ initial, onSave, onCancel }: {
  initial?: Partial<Driver>;
  onSave: (d: Omit<Driver, "id" | "fullName" | "assignedVehicleIds" | "accidentIds" | "documentIds">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    uniqueId: initial?.uniqueId ?? "",
    email: initial?.email ?? "",
    dateOfBirth: initial?.dateOfBirth ?? "",
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
    if (!form.firstName.trim()) err.firstName = "שדה חובה";
    if (!form.lastName.trim()) err.lastName = "שדה חובה";
    if (!form.uniqueId.trim()) err.uniqueId = "שדה חובה";
    if (!form.driverLicenseNumber.trim()) err.driverLicenseNumber = "שדה חובה";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) err.email = "כתובת מייל לא תקינה";
    setErrors(err);
    if (Object.keys(err).length > 0) return;
    onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="שם פרטי" value={form.firstName} onChange={e => set("firstName", e.target.value)} error={errors.firstName} placeholder="שם פרטי" />
        <Input label="שם משפחה" value={form.lastName} onChange={e => set("lastName", e.target.value)} error={errors.lastName} placeholder="שם משפחה" />
      </div>
      <Input label="מספר תעודת זהות" value={form.uniqueId} onChange={e => set("uniqueId", e.target.value)} error={errors.uniqueId} placeholder="000000000" />
      <Input label="כתובת מייל" type="email" value={form.email} onChange={e => set("email", e.target.value)} error={errors.email} placeholder="driver@example.com" />
      <Input label="תאריך לידה" type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} />
      <Input label="מספר רישיון נהיגה" value={form.driverLicenseNumber} onChange={e => set("driverLicenseNumber", e.target.value)} error={errors.driverLicenseNumber} placeholder="0000000" />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} type="button">ביטול</Button>
        <Button type="submit">שמור נהג</Button>
      </div>
    </form>
  );
}

function Avatar({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-xl bg-[#032147]/10 flex items-center justify-center text-[#032147] font-bold text-xs shrink-0">
      {initials}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={[
          "h-8 pl-3 pr-7 rounded-lg border text-xs appearance-none cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30",
          value ? "border-[#209dd7] bg-[#209dd7]/5 text-[#209dd7] font-medium" : "border-gray-200 bg-white text-gray-600",
        ].join(" ")}
      >
        <option value="">{label}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={11} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
    </div>
  );
}

function BulkBar({ count, vehicleOptions, onAssignVehicle, onDelete, onClear }: {
  count: number;
  vehicleOptions: { id: string; label: string }[];
  onAssignVehicle: (vehicleId: string) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [pickVehicle, setPickVehicle] = useState(false);
  return (
    <div className="flex items-center gap-3 bg-[#032147] text-white rounded-xl px-4 py-2.5 text-sm">
      <span className="font-semibold">{count} נבחרו</span>
      <div className="h-4 w-px bg-white/20" />
      <div className="relative">
        <button
          onClick={() => setPickVehicle(p => !p)}
          className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          <UserCheck size={12} /> שבץ לרכב <ChevronDown size={11} />
        </button>
        {pickVehicle && (
          <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-[220px] max-h-56 overflow-y-auto">
            {vehicleOptions.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">אין רכבים</div>}
            {vehicleOptions.map(v => (
              <button key={v.id} onClick={() => { onAssignVehicle(v.id); setPickVehicle(false); }}
                className="flex items-center gap-2 w-full text-right px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Car size={12} className="text-[#209dd7] shrink-0" />
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onDelete}
        className="flex items-center gap-1.5 text-xs bg-red-500/80 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors">
        <Trash2 size={12} /> מחק נבחרים
      </button>
      <button onClick={onClear} className="mr-auto text-white/60 hover:text-white transition-colors">
        <X size={16} />
      </button>
    </div>
  );
}

export default function DriversPage() {
  const { drivers, vehicles, addDriver, deleteDriver, updateVehicle } = useStore();

  const [search, setSearch] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterAccidents, setFilterAccidents] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  const activeFilterCount = [filterVehicle, filterAccidents].filter(Boolean).length;

  const filtered = useMemo(() => drivers.filter(d => {
    if (search) {
      const q = search.toLowerCase();
      if (![d.fullName, d.firstName, d.lastName, d.uniqueId, d.driverLicenseNumber].join(" ").toLowerCase().includes(q)) return false;
    }
    const hasVehicle = vehicles.some(v => v.mainDriverId === d.id || v.secondaryDriverIds.includes(d.id));
    if (filterVehicle === "yes" && !hasVehicle) return false;
    if (filterVehicle === "no" && hasVehicle) return false;
    if (filterAccidents === "yes" && d.accidentIds.length === 0) return false;
    if (filterAccidents === "no" && d.accidentIds.length > 0) return false;
    return true;
  }), [drivers, vehicles, search, filterVehicle, filterAccidents]);

  const filteredIds = useMemo(() => new Set(filtered.map(d => d.id)), [filtered]);
  const visibleSelected = useMemo(() => new Set([...selected].filter(id => filteredIds.has(id))), [selected, filteredIds]);
  const allChecked = filtered.length > 0 && visibleSelected.size === filtered.length;
  const someChecked = visibleSelected.size > 0 && !allChecked;

  function toggleAll() {
    if (allChecked) {
      setSelected(s => { const n = new Set(s); filtered.forEach(d => n.delete(d.id)); return n; });
    } else {
      setSelected(s => { const n = new Set(s); filtered.forEach(d => n.add(d.id)); return n; });
    }
  }

  function toggleOne(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function bulkAssignVehicle(vehicleId: string) {
    const ids = [...visibleSelected];
    if (ids.length === 0) return;
    await updateVehicle(vehicleId, { mainDriverId: ids[0], secondaryDriverIds: ids.slice(1) });
    setSelected(new Set());
  }

  async function bulkDelete() {
    await Promise.all([...visibleSelected].map(id => deleteDriver(id)));
    setSelected(new Set());
    setBulkDeleteOpen(false);
  }

  function clearFilters() { setFilterVehicle(""); setFilterAccidents(""); setSearch(""); }

  const vehicleOptions = vehicles.map(v => ({ id: v.id, label: `${v.manufacturer} ${v.model} (${v.licensePlate})` }));
  const getAffectedVehicles = (d: Driver) => vehicles.filter(v => v.mainDriverId === d.id || v.secondaryDriverIds.includes(d.id));

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">נהגים</h1>
          <p className="text-sm text-gray-500 mt-0.5">{drivers.length} נהגים רשומים במערכת</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={15} /> הוסף נהג
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full pl-9 pr-4 h-9 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all"
            placeholder="חיפוש חופשי..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(p => !p)}
          className={["flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm transition-all",
            showFilters || activeFilterCount > 0 ? "border-[#209dd7] bg-[#209dd7]/5 text-[#209dd7]" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
          ].join(" ")}
        >
          <SlidersHorizontal size={14} />
          סינון
          {activeFilterCount > 0 && (
            <span className="bg-[#209dd7] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {(activeFilterCount > 0 || search) && (
          <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <X size={12} /> נקה הכל
          </button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <FilterSelect label="שיבוץ רכב" value={filterVehicle} onChange={setFilterVehicle}
            options={[{ value: "yes", label: "משובצים לרכב" }, { value: "no", label: "ללא שיבוץ" }]} />
          <FilterSelect label="תאונות" value={filterAccidents} onChange={setFilterAccidents}
            options={[{ value: "yes", label: "יש תאונות" }, { value: "no", label: "ללא תאונות" }]} />
          <span className="mr-auto text-xs text-gray-400 self-center">{filtered.length} תוצאות</span>
        </div>
      )}

      {visibleSelected.size > 0 && (
        <BulkBar count={visibleSelected.size} vehicleOptions={vehicleOptions}
          onAssignVehicle={bulkAssignVehicle} onDelete={() => setBulkDeleteOpen(true)} onClear={() => setSelected(new Set())} />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-50 bg-[#f8fafc]">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll} className="w-4 h-4 rounded border-gray-300 text-[#209dd7] cursor-pointer" />
                </th>
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
                const isChecked = visibleSelected.has(d.id);
                const assigned = vehicles.filter(v => v.mainDriverId === d.id || v.secondaryDriverIds.includes(d.id));
                return (
                  <tr key={d.id} onClick={() => toggleOne(d.id)}
                    className={["transition-colors cursor-pointer group", isChecked ? "bg-[#209dd7]/5" : "hover:bg-[#f8fafc]"].join(" ")}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleOne(d.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#209dd7] cursor-pointer" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={d.fullName} />
                        <div>
                          <div className="font-semibold text-[#032147] text-sm">{d.fullName}</div>
                          {d.dateOfBirth && <div className="text-xs text-gray-400">נולד: {d.dateOfBirth}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 tabular-nums">{d.uniqueId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.driverLicenseNumber}</td>
                    <td className="px-4 py-3">
                      {assigned.length === 0 ? (
                        <span className="text-xs text-gray-400">ללא שיבוץ</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {assigned.map(v => (
                            <div key={v.id} className="flex items-center gap-1.5">
                              <Car size={11} className="text-[#209dd7] shrink-0" />
                              <span className="text-xs text-gray-600">{v.manufacturer} {v.model}<span className="text-gray-400"> ({v.licensePlate})</span></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {d.accidentIds.length > 0 ? (
                        <Badge variant="danger" dot>{d.accidentIds.length} תאונ{d.accidentIds.length > 1 ? "ות" : "ה"}</Badge>
                      ) : (
                        <span className="text-xs text-gray-400">ללא</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/drivers/${d.id}`}>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors">
                            <Eye size={14} />
                          </button>
                        </Link>
                        <button onClick={() => setDeleteTarget(d)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">לא נמצאו נהגים</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="הוספת נהג חדש">
        <DriverForm
          onSave={data => { addDriver({ ...data, assignedVehicleIds: [], accidentIds: [], documentIds: [] }); setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteDriver(deleteTarget.id); }}
        title="מחיקת נהג"
        description={`האם למחוק את ${deleteTarget?.fullName}?${deleteTarget && getAffectedVehicles(deleteTarget).length > 0 ? ` שיבוץ ב-${getAffectedVehicles(deleteTarget).map(v => v.licensePlate).join(", ")} יוסר. ` : " "}פעולה זו אינה ניתנת לביטול.`}
        confirmLabel="מחק נהג" danger />

      <ConfirmDialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={bulkDelete}
        title={`מחיקת ${visibleSelected.size} נהגים`}
        description={`האם למחוק את ${visibleSelected.size} הנהגים הנבחרים? פעולה זו אינה ניתנת לביטול.`}
        confirmLabel="מחק הכל" danger />
    </div>
  );
}
