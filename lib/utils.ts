import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Vehicle } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Formats "YYYY-MM-DD" or "YYYY-MM-DD HH:mm" → "DD/MM/YYYY" or "DD/MM/YYYY HH:mm"
export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const hasTime = dateStr.length > 10 && dateStr[10] === " ";
  const [datePart, timePart] = hasTime ? dateStr.split(" ") : [dateStr, undefined];
  const [y, m, d] = datePart.split("-");
  return timePart ? `${d}/${m}/${y} ${timePart}` : `${d}/${m}/${y}`;
}

// Always shows date + time (for assignment logs)
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "-";
  const hasTime = dateStr.length > 10 && dateStr[10] === " ";
  const [datePart, timePart] = hasTime ? dateStr.split(" ") : [dateStr, undefined];
  const [y, m, d] = datePart.split("-");
  return timePart ? `${d}/${m}/${y} ${timePart}` : `${d}/${m}/${y} 00:00`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(amount);
}

// ── Courtesy vehicle helpers ──────────────────────────────────────────────────
export type CourtesyStatus =
  | { type: "is_courtesy"; parent: Vehicle | undefined; self: Vehicle }
  | { type: "has_courtesy"; courtesy: Vehicle; self: Vehicle }
  | null;

/**
 * Single source of truth for courtesy relationship UI state.
 * - Returns "is_courtesy" if this vehicle IS an active courtesy vehicle.
 * - Returns "has_courtesy" if this vehicle is the main one with an active courtesy.
 * - Returns null otherwise.
 */
export function getCourtesyStatus(vehicle: Vehicle, allVehicles: Vehicle[]): CourtesyStatus {
  // Active courtesy = no actualReturnDate set
  if (vehicle.isCourtesy && !vehicle.courtesyActualReturnDate) {
    const parent = allVehicles.find(v => v.id === vehicle.parentVehicleId);
    return { type: "is_courtesy", parent, self: vehicle };
  }
  const activeCourtesy = allVehicles.find(v =>
    v.isCourtesy && v.parentVehicleId === vehicle.id && !v.courtesyActualReturnDate
  );
  if (activeCourtesy) return { type: "has_courtesy", courtesy: activeCourtesy, self: vehicle };
  return null;
}

/**
 * Returns the vehicle the driver is currently actually using.
 * If their main vehicle has an active courtesy, returns the courtesy. Else the main.
 */
export function getActiveVehicleForDriver(
  driverId: string,
  vehicles: Vehicle[]
): Vehicle | null {
  const main = vehicles.find(v =>
    !v.isCourtesy && (v.mainDriverId === driverId || v.secondaryDriverIds?.includes(driverId))
  );
  if (!main) return null;
  const activeCourtesy = vehicles.find(v =>
    v.isCourtesy && v.parentVehicleId === main.id && !v.courtesyActualReturnDate
  );
  return activeCourtesy ?? main;
}

/**
 * Returns the drivers assigned to a vehicle - inherits from parent if courtesy.
 */
export function resolveVehicleDrivers(vehicle: Vehicle, vehicles: Vehicle[]): {
  mainDriverId: string;
  secondaryDriverIds: string[];
  inherited: boolean;
} {
  if (vehicle.isCourtesy && vehicle.parentVehicleId) {
    const parent = vehicles.find(v => v.id === vehicle.parentVehicleId);
    return {
      mainDriverId: parent?.mainDriverId ?? "",
      secondaryDriverIds: parent?.secondaryDriverIds ?? [],
      inherited: true,
    };
  }
  return {
    mainDriverId: vehicle.mainDriverId,
    secondaryDriverIds: vehicle.secondaryDriverIds ?? [],
    inherited: false,
  };
}

/** Days between two YYYY-MM-DD strings (or YYYY-MM-DD HH:mm). */
export function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start.slice(0, 10)).getTime();
  const e = new Date(end.slice(0, 10)).getTime();
  return Math.max(0, Math.round((e - s) / 86400000));
}

export const COURTESY_REASON_LABELS: Record<string, string> = {
  service: "טיפול",
  accident: "תאונה",
  license: "טסט / רישוי",
  other: "אחר",
};
