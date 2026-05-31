import { cn } from "@/lib/utils";
import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#753991] hover:bg-[#622f7a] active:bg-[#52266a] text-white shadow-sm shadow-[#753991]/20",
  secondary:
    "bg-[#209dd7] hover:bg-[#1880b0] active:bg-[#156890] text-white shadow-sm shadow-[#209dd7]/20",
  ghost:
    "bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700",
  danger:
    "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm shadow-red-600/20",
  outline:
    "border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1",
  md: "px-4 py-2 text-sm gap-1.5",
  lg: "px-5 py-2.5 text-sm gap-2",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-xl font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#753991]/50 disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </button>
  );
}
