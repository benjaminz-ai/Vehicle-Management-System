import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
