"use client";
import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { GripVertical, Car, AlertTriangle, Wrench, Users, StickyNote } from "lucide-react";
import { cn, getCourtesyStatus } from "@/lib/utils";
import type { Vehicle, VehicleStatus } from "@/types";
import Link from "next/link";
import { CourtesyBadge } from "@/components/CourtesyPanel";

function VehicleCard({ vehicle, isDragging }: { vehicle: Vehicle; isDragging?: boolean }) {
  const { drivers, vehicleStatuses, accidentCards, vehicles } = useStore();
  const cStatus = getCourtesyStatus(vehicle, vehicles);
  // Inherit drivers if courtesy
  const driverSource = vehicle.isCourtesy && vehicle.parentVehicleId ? vehicles.find(x => x.id === vehicle.parentVehicleId) : null;
  const mainDriverId = driverSource ? driverSource.mainDriverId : vehicle.mainDriverId;
  const secondaryIds = driverSource ? driverSource.secondaryDriverIds : vehicle.secondaryDriverIds;
  const mainDriver = drivers.find(d => d.id === mainDriverId);
  const secondDriver = secondaryIds.length > 0 ? drivers.find(d => d.id === secondaryIds[0]) : null;
  const openAccidents = accidentCards.filter(a => a.vehicleId === vehicle.id && a.status !== "closed").length;

  return (
    <div className={cn(
      "rounded-xl border p-3 shadow-sm select-none",
      cStatus?.type === "is_courtesy" ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200",
      isDragging && "shadow-2xl rotate-1 opacity-90",
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-[#032147] truncate">{vehicle.manufacturer} {vehicle.model}</span>
            {cStatus?.type === "is_courtesy" && <CourtesyBadge variant="is_courtesy" />}
            {cStatus?.type === "has_courtesy" && <CourtesyBadge variant="has_courtesy" />}
          </div>
          <div className="text-xs text-gray-500 font-mono">{vehicle.licensePlate}</div>
        </div>
        <div className="text-gray-300 cursor-grab active:cursor-grabbing mt-0.5">
          <GripVertical size={14} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {mainDriver && (
          <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
            <Users size={10} />
            {mainDriver.firstName}
          </span>
        )}
        {secondDriver && (
          <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
            <Users size={10} />
            {secondDriver.firstName}
          </span>
        )}
        {openAccidents > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
            <AlertTriangle size={10} />
            {openAccidents} {openAccidents > 1 ? "תאונות" : "תאונה"}
          </span>
        )}
      </div>
      {vehicle.notes?.trim() && (
        <div className="flex items-start gap-1 mt-2 text-[11px] text-amber-700 bg-amber-50 px-1.5 py-1 rounded" title={vehicle.notes}>
          <StickyNote size={11} className="shrink-0 mt-0.5" />
          <span className="line-clamp-2 break-words">{vehicle.notes}</span>
        </div>
      )}
      <div className="mt-2">
        <Link href={`/vehicles/${vehicle.id}`} className="text-[11px] text-[#209dd7] hover:underline" onClick={e => e.stopPropagation()}>
          צפה בפרטים
        </Link>
      </div>
    </div>
  );
}

function SortableVehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: vehicle.id,
    data: { type: "vehicle", vehicle },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <VehicleCard vehicle={vehicle} />
    </div>
  );
}

function StatusColumn({
  status,
  vehicles,
  onDrop,
}: {
  status: VehicleStatus;
  vehicles: Vehicle[];
  onDrop?: () => void;
}) {
  const { attributes, listeners, setNodeRef: setColRef, transform, transition } = useSortable({
    id: status.id,
    data: { type: "column" },
  });

  const colStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const vehicleIds = vehicles.map(v => v.id);

  return (
    <div ref={setColRef} style={colStyle} className="flex-shrink-0 w-64">
      <div
        {...attributes}
        {...listeners}
        className="sticky top-0 z-10 flex items-center gap-2 py-2 mb-2 cursor-grab active:cursor-grabbing bg-[#f0f4f8] border-b border-gray-200"
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
        <h3 className="text-sm font-semibold text-[#032147]">{status.name}</h3>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{vehicles.length}</span>
      </div>
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-2 min-h-[120px] space-y-2">
        <SortableContext items={vehicleIds} strategy={verticalListSortingStrategy}>
          {vehicles.map(v => (
            <SortableVehicleCard key={v.id} vehicle={v} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { vehicles, vehicleStatuses, moveVehicleStatus, reorderStatuses } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmMove, setConfirmMove] = useState<{ vehicleId: string; statusId: string; statusName: string } | null>(null);
  const [pendingMove, setPendingMove] = useState<{ vehicleId: string; statusId: string } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const sortedStatuses = useMemo(
    () => [...vehicleStatuses].sort((a, b) => a.sortOrder - b.sortOrder),
    [vehicleStatuses],
  );

  const vehiclesByStatus = useMemo(() => {
    const map: Record<string, Vehicle[]> = {};
    sortedStatuses.forEach(s => { map[s.id] = []; });
    // Show only fleet vehicles + active courtesies on the board (returned courtesies are archived)
    vehicles.forEach(v => {
      if (v.isCourtesy && v.courtesyActualReturnDate) return;
      if (map[v.statusId]) map[v.statusId].push(v);
    });
    return map;
  }, [vehicles, sortedStatuses]);

  const activeVehicle = activeId ? vehicles.find(v => v.id === activeId) : null;
  const columnIds = sortedStatuses.map(s => s.id);

  const SENSITIVE = ["Accident / Insurance", "Inactive"];

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    if (active.data.current?.type === "vehicle") {
      setActiveId(active.id as string);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === "column" && overType === "column" && active.id !== over.id) {
      const oldIndex = sortedStatuses.findIndex(s => s.id === active.id);
      const newIndex = sortedStatuses.findIndex(s => s.id === over.id);
      const reordered = arrayMove(sortedStatuses, oldIndex, newIndex);
      reorderStatuses(reordered.map(s => s.id));
      return;
    }

    if (activeType === "vehicle") {
      const vehicleId = active.id as string;
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (!vehicle) return;

      let targetStatusId: string | null = null;
      if (overType === "column") {
        targetStatusId = over.id as string;
      } else if (overType === "vehicle") {
        const overVehicle = vehicles.find(v => v.id === over.id);
        if (overVehicle) targetStatusId = overVehicle.statusId;
      }

      if (!targetStatusId || targetStatusId === vehicle.statusId) return;

      const targetStatus = vehicleStatuses.find(s => s.id === targetStatusId);
      if (!targetStatus) return;

      if (SENSITIVE.includes(targetStatus.name)) {
        setConfirmMove({ vehicleId, statusId: targetStatusId, statusName: targetStatus.name });
      } else {
        moveVehicleStatus(vehicleId, targetStatusId);
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    // handled in dragEnd
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#032147]">לוח רכבים</h1>
        <p className="text-sm text-[#888888] mt-0.5">גררו רכבים בין עמודות הסטטוס. גררו את כותרות העמודות כדי לסדר מחדש.</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          <div className="overflow-auto max-h-[calc(100vh-200px)] pb-4">
            <div className="flex gap-5">
              {sortedStatuses.map(status => (
                <StatusColumn
                  key={status.id}
                  status={status}
                  vehicles={vehiclesByStatus[status.id] ?? []}
                />
              ))}
            </div>
          </div>
        </SortableContext>

        <DragOverlay>
          {activeVehicle && <VehicleCard vehicle={activeVehicle} isDragging />}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={!!confirmMove}
        onClose={() => setConfirmMove(null)}
        onConfirm={() => {
          if (confirmMove) moveVehicleStatus(confirmMove.vehicleId, confirmMove.statusId);
        }}
        title={`להעביר ל"${confirmMove?.statusName}"?`}
        description={`פעולה זו תשנה את סטטוס הרכב ל"${confirmMove?.statusName}". השינוי משפיע על רשומת הרכב ולא ניתן לביטול אוטומטי.`}
        confirmLabel="העבר רכב"
        danger
      />
    </div>
  );
}
