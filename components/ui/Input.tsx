import { cn } from "@/lib/utils";
import React from "react";

export function Input({
  label,
  error,
  hint,
  className,
  ...props
}: {
  label?: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        {...props}
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all disabled:bg-gray-50 disabled:text-gray-400",
          error && "border-red-400 focus:ring-red-400/30 focus:border-red-400",
          className
        )}
      />
      {hint && !error && <span className="text-xs text-gray-400">{hint}</span>}
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
}

export function Select({
  label,
  error,
  children,
  className,
  ...props
}: {
  label?: string;
  error?: string;
  children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        {...props}
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all disabled:bg-gray-50",
          error && "border-red-400",
          className
        )}
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  className,
  ...props
}: {
  label?: string;
  error?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        {...props}
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all resize-none",
          error && "border-red-400",
          className
        )}
      />
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
}
