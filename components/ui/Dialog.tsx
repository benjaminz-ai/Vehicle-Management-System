"use client";
import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, AlertTriangle } from "lucide-react";

export function Dialog({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#032147]/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          "relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] border border-gray-100",
          widths[size]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-[#032147]">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "אישור",
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#032147]/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 p-6">
        {danger && (
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
        )}
        <h2 className="text-base font-semibold text-[#032147] mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={cn(
              "px-4 py-2 text-sm rounded-xl text-white font-medium transition-colors shadow-sm",
              danger
                ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                : "bg-[#753991] hover:bg-[#622f7a] shadow-[#753991]/20"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
