"use client";
import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { VehicleForm } from "@/components/VehicleForm";
import { Plus, Trash2, Eye, Search, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { Vehicle } from "@/types";

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

function BulkBar({ count, statuses, onChangeStatus, onDelete, onClear }: {
  count: number;
  statuses: { id: string; name: string; color: string }[];
  onChangeStatus: (statusId: string) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [pickStatus, setPickStatus] = useState(false);
  return (
    <div className="flex items-center gap-3 bg-[#032147] text-white rounded-xl px-4 py-2.5 text-sm">
      <span className="font-semibold">{count} נבחרו</span>
      <div className="h-4 w-px bg-white/20" />
      <div className="relative">
        <button onClick={() => setPickStatus(p => !p)}
          className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
          שנה סטטוס <ChevronDown size={11} />
        </button>
        {pickStatus && (
          <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-[160px]">
            {statuses.map(s => (
              <button key={s.id} onClick={() => { onChangeStatus(s.id); setPickStatus(false); }}
                className="flex items-center gap-2 w-full text-right px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.name}
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

export default function VehiclesPage() {
  const { vehicles, drivers, vehicleStatuses, vehicleTypes, fuelTypes, addVehicle, deleteVehicle, updateVehicle, addVehicleInsurance } = useStore();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFuel, setFilterFuel] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterAccidents, setFilterAccidents] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const activeFilterCount = [filterStatus, filterType, filterFuel, filterOwner, filterAccidents].filter(Boolean).length;

  const filtered = useMemo(() => vehicles.filter(v => {
    if (search) {
      const q = search.toLowerCase();
      const status = vehicleStatuses.find(s => s.id === v.statusId);
      const vtype = vehicleTypes.find(t => t.id === v.vehicleTypeId);
      const ftype = fuelTypes.find(f => f.id === v.fuelTypeId);
      const mainDriver = drivers.find(d => d.id === v.mainDriverId);
      const haystack = [v.licensePlate, v.manufacturer, v.model, String(v.year), status?.name, vtype?.name, ftype?.name, v.leasingCompanyName, mainDriver?.fullName]
        .filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filterStatus && v.statusId !== filterStatus) return false;
    if (filterType && v.vehicleTypeId !== filterType) return false;
    if (filterFuel && v.fuelTypeId !== filterFuel) return false;
    if (filterOwner && v.ownershipType !== filterOwner) return false;
    if (filterAccidents === "yes" && v.accidentIds.length === 0) return false;
    if (filterAccidents === "no" && v.accidentIds.length > 0) return false;
    return true;
  }), [vehicles, search, filterStatus, filterType, filterFuel, filterOwner, filterAccidents, vehicleStatuses, vehicleTypes, fuelTypes, drivers]);

  const filteredIds = useMemo(() => new Set(filtered.map(v => v.id)), [filtered]);
  const visibleSelected = useMemo(() => new Set([...selected].filter(id => filteredIds.has(id))), [selected, filteredIds]);
  const allChecked = filtered.length > 0 && visibleSelected.size === filtered.length;
  const someChecked = visibleSelected.size > 0 && !allChecked;

  function toggleAll() {
    if (allChecked) {
      setSelected(s => { const n = new Set(s); filtered.forEach(v => n.delete(v.id)); return n; });
    } else {
      setSelected(s => { const n = new Set(s); filtered.forEach(v => n.add(v.id)); return n; });
    }
  }

  function toggleOne(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function bulkChangeStatus(statusId: string) {
    await Promise.all([...visibleSelected].map(id => updateVehicle(id, { statusId })));
    setSelected(new Set());
  }

  async function bulkDelete() {
    await Promise.all([...visibleSelected].map(id => deleteVehicle(id)));
    setSelected(new Set());
    setBulkDeleteOpen(false);
  }

  function clearFilters() {
    setFilterStatus(""); setFilterType(""); setFilterFuel(""); setFilterOwner(""); setFilterAccidents(""); setSearch("");
  }

  const statusVariant = (name: string): "success" | "warning" | "danger" | "purple" | "gray" => {
    if (name === "פעיל") return "success";
    if (name === "בטיפול") return "warning";
    if (name.includes("תאונה")) return "danger";
    if (name.includes("ממתין")) return "purple";
    return "gray";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">רכבים</h1>
          <p className="text-sm text-gray-500 mt-0.5">{vehicles.length} רכבים בצי</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={15} /> הוסף רכב
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
          <FilterSelect label="סטטוס" value={filterStatus} onChange={setFilterStatus}
            options={vehicleStatuses.map(s => ({ value: s.id, label: s.name }))} />
          <FilterSelect label="סוג רכב" value={filterType} onChange={setFilterType}
            options={vehicleTypes.map(t => ({ value: t.id, label: t.name }))} />
          <FilterSelect label="סוג דלק" value={filterFuel} onChange={setFilterFuel}
            options={fuelTypes.map(f => ({ value: f.id, label: f.name }))} />
          <FilterSelect label="בעלות" value={filterOwner} onChange={setFilterOwner}
            options={[{ value: "company_owned", label: "בעלות החברה" }, { value: "leasing", label: "ליסינג" }]} />
          <FilterSelect label="תאונות" value={filterAccidents} onChange={setFilterAccidents}
            options={[{ value: "yes", label: "יש תאונות" }, { value: "no", label: "ללא תאונות" }]} />
          <span className="mr-auto text-xs text-gray-400 self-center">{filtered.length} תוצאות</span>
        </div>
      )}

      {visibleSelected.size > 0 && (
        <BulkBar count={visibleSelected.size} statuses={vehicleStatuses}
          onChangeStatus={bulkChangeStatus} onDelete={() => setBulkDeleteOpen(true)} onClear={() => setSelected(new Set())} />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[740px]">
            <thead>
              <tr className="border-b border-gray-50 bg-[#f8fafc]">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll} className="w-4 h-4 rounded border-gray-300 text-[#209dd7] cursor-pointer" />
                </th>
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
                const isChecked = visibleSelected.has(v.id);
                const mainDriver = drivers.find(d => d.id === v.mainDriverId);
                const secondDriver = v.secondaryDriverIds?.[0] ? drivers.find(d => d.id === v.secondaryDriverIds[0]) : null;
                const status = vehicleStatuses.find(s => s.id === v.statusId);
                const vtype = vehicleTypes.find(t => t.id === v.vehicleTypeId);
                const ftype = fuelTypes.find(f => f.id === v.fuelTypeId);
                return (
                  <tr key={v.id} onClick={() => toggleOne(v.id)}
                    className={["transition-colors cursor-pointer group", isChecked ? "bg-[#209dd7]/5" : "hover:bg-[#f8fafc]"].join(" ")}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleOne(v.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#209dd7] cursor-pointer" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#032147]">{v.manufacturer} {v.model}</div>
                      <div className="text-xs text-gray-400">{v.year}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">{v.licensePlate}</span>
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
                      <div className="text-sm text-gray-700">{v.ownershipType === "company_owned" ? "בעלות החברה" : "ליסינג"}</div>
                      {v.leasingCompanyName && <div className="text-xs text-gray-400">{v.leasingCompanyName}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {status && <Badge variant={statusVariant(status.name)} dot>{status.name}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">{v.mileage.toLocaleString()} km</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/vehicles/${v.id}`}>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors">
                            <Eye size={14} />
                          </button>
                        </Link>
                        <button onClick={() => setDeleteTarget(v)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">לא נמצאו רכבים</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="הוספת רכב" size="lg">
        <VehicleForm
          onSave={async (data, insurances) => {
            const vehicleId = await addVehicle({ ...data, serviceRecordIds: [], accidentIds: [], documentIds: [], secondaryDriverIds: [] });
            for (const ins of insurances) await addVehicleInsurance({ ...ins, vehicleId });
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteVehicle(deleteTarget.id); }}
        title="מחיקת רכב"
        description={`האם למחוק את ${deleteTarget?.manufacturer} ${deleteTarget?.model} (${deleteTarget?.licensePlate})? פעולה זו אינה ניתנת לביטול.`}
        confirmLabel="מחק רכב" danger />

      <ConfirmDialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={bulkDelete}
        title={`מחיקת ${visibleSelected.size} רכבים`}
        description={`האם למחוק את ${visibleSelected.size} הרכבים הנבחרים? פעולה זו אינה ניתנת לביטול.`}
        confirmLabel="מחק הכל" danger />
    </div>
  );
}
