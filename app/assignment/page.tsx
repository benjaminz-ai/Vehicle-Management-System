"use client";
import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Search, X, ChevronDown, UserPlus, UserMinus, AlertTriangle, Check, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type StagedAssignment = {
  mainDriverId: string;
  secondaryDriverIds: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Draggable driver row (used in both the drawer list and the DragOverlay)
// ─────────────────────────────────────────────────────────────────────────────
function DraggableDriverRow({
  driverId,
  name,
  license,
  isDragging,
}: {
  driverId: string;
  name: string;
  license: string;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `drag-${driverId}` });
  const parts    = name.trim().split(" ");
  const initials = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-white transition-all",
        isDragging
          ? "opacity-40 border-dashed border-gray-200"
          : "border-gray-100 shadow-sm hover:border-[#209dd7]/40 hover:shadow-md cursor-grab active:cursor-grabbing"
      )}
    >
      <div
        {...listeners}
        {...attributes}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical size={14} />
      </div>
      <div className="w-7 h-7 rounded-lg bg-[#032147]/10 flex items-center justify-center text-[#032147] font-bold text-[10px] shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[#032147] truncate">{name}</div>
        <div className="text-[10px] text-gray-400 font-mono">{license}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drop zone
// ─────────────────────────────────────────────────────────────────────────────
function DropZone({
  id,
  label,
  over,
  children,
  className,
}: {
  id: string;
  label: string;
  over: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-2 border-dashed transition-all p-3",
        over
          ? "border-[#209dd7] bg-[#209dd7]/5"
          : "border-gray-200 bg-gray-50/50",
        className
      )}
    >
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm removal dialog
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmRemoveDialog({
  driverName,
  role,
  onConfirm,
  onCancel,
}: {
  driverName: string;
  role: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-80">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div>
            <div className="font-bold text-[#032147] text-sm">הסרת נהג</div>
            <div className="text-xs text-gray-500 mt-0.5">פעולה זו תירשם בלוג השיבוצים</div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          האם להסיר את <span className="font-semibold text-[#032147]">{driverName}</span>{" "}
          ({role}) מהרכב? השינוי ייכנס לתוקף לאחר שמירה.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">ביטול</Button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-colors"
          >
            הסר
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment Drawer
// ─────────────────────────────────────────────────────────────────────────────
function AssignDrawer({
  vehicleId,
  onClose,
}: {
  vehicleId: string;
  onClose: () => void;
}) {
  const { vehicles, drivers, vehicleStatuses, saveVehicleAssignment } = useStore();
  const v = vehicles.find(x => x.id === vehicleId)!;
  const status = vehicleStatuses.find(s => s.id === v?.statusId);

  const [staged, setStaged] = useState<StagedAssignment>({
    mainDriverId: v.mainDriverId ?? "",
    secondaryDriverIds: [...v.secondaryDriverIds],
  });
  const [driverSearch, setDriverSearch] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; role: string } | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overZone, setOverZone] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const stagedAll = [staged.mainDriverId, ...staged.secondaryDriverIds].filter(Boolean);
  const isDirty =
    staged.mainDriverId !== (v.mainDriverId ?? "") ||
    JSON.stringify([...staged.secondaryDriverIds].sort()) !==
    JSON.stringify([...v.secondaryDriverIds].sort());

  const availableDrivers = drivers.filter(d => {
    if (stagedAll.includes(d.id)) return false;
    const q = driverSearch.toLowerCase();
    if (q && ![d.fullName, d.driverLicenseNumber, d.uniqueId].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function handleDragOver(e: { over: { id: string } | null }) {
    setOverZone(e.over?.id ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverZone(null);
    if (!e.over) return;
    const driverId = (e.active.id as string).replace("drag-", "");
    const zone     = e.over.id as string;
    if (zone === "zone-main") {
      // Demote current main to secondary
      const prevMain = staged.mainDriverId;
      setStaged(prev => ({
        mainDriverId: driverId,
        secondaryDriverIds: prevMain
          ? [...prev.secondaryDriverIds.filter(id => id !== driverId), prevMain]
          : prev.secondaryDriverIds.filter(id => id !== driverId),
      }));
    } else if (zone === "zone-secondary") {
      setStaged(prev => ({
        ...prev,
        secondaryDriverIds: prev.secondaryDriverIds.includes(driverId)
          ? prev.secondaryDriverIds
          : [...prev.secondaryDriverIds, driverId],
      }));
    }
  }

  function clickAssign(driverId: string) {
    setStaged(prev => {
      if (!prev.mainDriverId) return { ...prev, mainDriverId: driverId };
      return { ...prev, secondaryDriverIds: [...prev.secondaryDriverIds, driverId] };
    });
  }

  function requestRemove(id: string) {
    const role = id === staged.mainDriverId ? "נהג ראשי" : "נהג משני";
    setConfirmRemove({ id, role });
  }

  function confirmRemoveDriver() {
    if (!confirmRemove) return;
    const id = confirmRemove.id;
    setStaged(prev => {
      if (prev.mainDriverId === id) {
        const [newMain, ...rest] = prev.secondaryDriverIds;
        return { mainDriverId: newMain ?? "", secondaryDriverIds: rest };
      }
      return { ...prev, secondaryDriverIds: prev.secondaryDriverIds.filter(sid => sid !== id) };
    });
    setConfirmRemove(null);
  }

  // Drivers removed compared to current vehicle state
  const originalAll = [v.mainDriverId, ...v.secondaryDriverIds].filter(Boolean);
  const stagedAllIds = [staged.mainDriverId, ...staged.secondaryDriverIds].filter(Boolean);
  const removedDrivers = originalAll
    .filter(id => !stagedAllIds.includes(id))
    .map(id => drivers.find(d => d.id === id))
    .filter(Boolean);

  function handleSave() {
    // If any assigned drivers are being removed → show final confirmation
    if (removedDrivers.length > 0) {
      setConfirmSave(true);
      return;
    }
    doSave();
  }

  function doSave() {
    saveVehicleAssignment(vehicleId, staged.mainDriverId, staged.secondaryDriverIds);
    onClose();
  }

  const dragDriver = activeId ? drivers.find(d => `drag-${d.id}` === activeId) : null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/20 backdrop-blur-[2px]" onClick={isDirty ? undefined : onClose} />

      <div className="w-[380px] bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-[#032147] px-5 py-4 flex items-start justify-between shrink-0">
          <div>
            <div className="text-white font-bold text-base">{v.manufacturer} {v.model}</div>
            <div className="text-white/50 text-xs mt-0.5 font-mono">{v.licensePlate}</div>
            {status && (
              <span
                className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: status.color + "33", color: status.color }}
              >
                {status.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {isDirty && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span className="text-xs text-amber-700 font-medium">יש שינויים שלא נשמרו</span>
          </div>
        )}

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver as never}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* Drop zones */}
            <DropZone id="zone-main" label="נהג ראשי" over={overZone === "zone-main"}>
              {staged.mainDriverId ? (() => {
                const d = drivers.find(x => x.id === staged.mainDriverId);
                if (!d) return null;
                return (
                  <div className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2 border border-gray-100 shadow-sm">
                    <div className="w-7 h-7 rounded-lg bg-[#032147]/10 flex items-center justify-center text-[#032147] font-bold text-[10px] shrink-0">
                      {d.fullName.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-[#032147] truncate">{d.fullName}</span>
                    <button
                      onClick={() => requestRemove(d.id)}
                      className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <UserMinus size={13} />
                    </button>
                  </div>
                );
              })() : (
                <div className="text-xs text-gray-400 text-center py-2">גרור נהג לכאן או לחץ להוספה</div>
              )}
            </DropZone>

            <DropZone id="zone-secondary" label="נהגים משניים" over={overZone === "zone-secondary"}>
              {staged.secondaryDriverIds.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-2">גרור נהגים לכאן</div>
              )}
              {staged.secondaryDriverIds.map(sid => {
                const d = drivers.find(x => x.id === sid);
                if (!d) return null;
                return (
                  <div key={sid} className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2 border border-gray-100 shadow-sm mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-[#032147]/10 flex items-center justify-center text-[#032147] font-bold text-[10px] shrink-0">
                      {d.fullName.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-[#032147] truncate">{d.fullName}</span>
                    <button
                      onClick={() => requestRemove(d.id)}
                      className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <UserMinus size={13} />
                    </button>
                  </div>
                );
              })}
            </DropZone>

            {/* Available drivers */}
            <div>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-2">נהגים זמינים</p>
              <div className="relative mb-2">
                <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pr-8 pl-3 h-8 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all"
                  placeholder="חיפוש..."
                  value={driverSearch}
                  onChange={e => setDriverSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                {availableDrivers.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-4">כל הנהגים משובצים</div>
                )}
                {availableDrivers.map(d => (
                  <div key={d.id} className="flex items-center gap-1">
                    <div className="flex-1">
                      <DraggableDriverRow
                        driverId={d.id}
                        name={d.fullName}
                        license={d.driverLicenseNumber}
                        isDragging={activeId === `drag-${d.id}`}
                      />
                    </div>
                    <button
                      onClick={() => clickAssign(d.id)}
                      className="p-2 rounded-xl hover:bg-[#209dd7]/10 text-gray-300 hover:text-[#209dd7] transition-colors shrink-0"
                      title="הוסף"
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DragOverlay>
            {dragDriver && (
              <DraggableDriverRow
                driverId={dragDriver.id}
                name={dragDriver.fullName}
                license={dragDriver.driverLicenseNumber}
              />
            )}
          </DragOverlay>
        </DndContext>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">ביטול</Button>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 transition-all",
              isDirty
                ? "bg-[#032147] hover:bg-[#032147]/90 text-white shadow-md"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            <Check size={14} />
            שמור שיבוץ
          </button>
        </div>
      </div>

      {confirmRemove && (
        <ConfirmRemoveDialog
          driverName={drivers.find(d => d.id === confirmRemove.id)?.fullName ?? ""}
          role={confirmRemove.role}
          onConfirm={confirmRemoveDriver}
          onCancel={() => setConfirmRemove(null)}
        />
      )}

      {/* Final save confirmation — shown when drivers are being unassigned */}
      {confirmSave && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 rounded-none">
          <div className="bg-white rounded-2xl shadow-2xl mx-4 p-5 w-full max-w-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-[#032147] text-sm">אישור ניתוק שיבוץ</p>
                <p className="text-xs text-gray-500 mt-0.5">הנהגים הבאים יוסרו מהרכב ושיבוצם יסתיים:</p>
              </div>
            </div>
            <ul className="mb-4 space-y-1.5">
              {removedDrivers.map(d => d && (
                <li key={d.id} className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2 text-sm font-medium text-amber-800">
                  <div className="w-6 h-6 rounded-md bg-amber-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {d.fullName.split(" ").map(p => p[0]).slice(0,2).join("")}
                  </div>
                  {d.fullName}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 mb-4">זמן סיום השיבוץ יירשם לפי שעון ישראל.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmSave(false)}
                className="flex-1 h-9 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={() => { setConfirmSave(false); doSave(); }}
                className="flex-1 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
              >
                אישור — נתק שיבוץ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Card
// ─────────────────────────────────────────────────────────────────────────────
function VehicleCard({
  vehicleId,
  onClick,
  selected,
}: {
  vehicleId: string;
  onClick: () => void;
  selected: boolean;
}) {
  const { vehicles, drivers, vehicleStatuses, vehicleTypes, fuelTypes } = useStore();
  const v = vehicles.find(x => x.id === vehicleId)!;
  const status = vehicleStatuses.find(s => s.id === v.statusId);
  const vtype  = vehicleTypes.find(t => t.id === v.vehicleTypeId);
  const ftype  = fuelTypes.find(f => f.id === v.fuelTypeId);
  const mainDriver     = v.mainDriverId ? drivers.find(d => d.id === v.mainDriverId) : null;
  const secondaryCount = v.secondaryDriverIds.length;

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border p-4 cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 group",
        selected
          ? "border-[#209dd7] ring-2 ring-[#209dd7]/20 shadow-md"
          : "border-gray-100 shadow-sm hover:border-gray-200"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-bold text-[#032147] text-sm leading-tight">{v.manufacturer} {v.model}</div>
          <div className="text-xs text-gray-400 mt-0.5">{v.year}</div>
        </div>
        {status && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: status.color + "22", color: status.color }}
          >
            {status.name}
          </span>
        )}
      </div>

      <div className="mb-3">
        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">{v.licensePlate}</span>
      </div>

      <div className="flex gap-1.5 mb-3 flex-wrap">
        {vtype && <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{vtype.name}</span>}
        {ftype && <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{ftype.name}</span>}
      </div>

      <div className="min-h-[44px]">
        {mainDriver ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#032147]/10 flex items-center justify-center text-[#032147] text-[9px] font-bold shrink-0">
              {mainDriver.fullName.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
            </div>
            <span className="text-xs text-[#032147] font-medium truncate">{mainDriver.fullName}</span>
            {secondaryCount > 0 && (
              <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                +{secondaryCount}
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-300 flex items-center gap-1">
            <UserPlus size={11} />
            ללא נהג
          </div>
        )}
      </div>

      <div className={cn(
        "mt-2 pt-2 border-t border-gray-50 text-[10px] flex items-center gap-1 transition-colors",
        selected ? "text-[#209dd7]" : "text-gray-300 group-hover:text-gray-400"
      )}>
        <UserPlus size={10} />
        {selected ? "ערוך שיבוץ" : "לחץ לשיבוץ"}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AssignmentPage() {
  const { vehicles, vehicleStatuses, vehicleTypes } = useStore();
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("");
  const [typeFilter, setType]     = useState("");
  const [selectedId, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vehicles.filter(v => {
      if (statusFilter && v.statusId !== statusFilter) return false;
      if (typeFilter   && v.vehicleTypeId !== typeFilter) return false;
      if (q && ![v.manufacturer, v.model, v.licensePlate].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [vehicles, search, statusFilter, typeFilter]);

  const unassigned = vehicles.filter(v => !v.mainDriverId).length;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#032147]">שיבוץ נהגים</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {vehicles.length} רכבים
          {unassigned > 0 && <span className="mr-1 text-amber-500 font-medium">· {unassigned} ללא שיבוץ</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="pr-9 pl-4 h-9 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all w-52"
            placeholder="חיפוש רכב..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="appearance-none h-9 pl-8 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 cursor-pointer"
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">כל הסטטוסים</option>
            {vehicleStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            className="appearance-none h-9 pl-8 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 cursor-pointer"
            value={typeFilter}
            onChange={e => setType(e.target.value)}
          >
            <option value="">כל הסוגים</option>
            {vehicleTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <ChevronDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {(search || statusFilter || typeFilter) && (
          <button
            onClick={() => { setSearch(""); setStatus(""); setType(""); }}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <X size={12} /> נקה
          </button>
        )}
        <span className="text-xs text-gray-400 mr-auto">{filtered.length} רכבים מוצגים</span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
          לא נמצאו רכבים
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(v => (
            <VehicleCard
              key={v.id}
              vehicleId={v.id}
              selected={selectedId === v.id}
              onClick={() => setSelected(prev => prev === v.id ? null : v.id)}
            />
          ))}
        </div>
      )}

      {selectedId && (
        <AssignDrawer
          vehicleId={selectedId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
