import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "purple" | "gray" | "blue";

const variants: Record<BadgeVariant, string> = {
  default:  "bg-gray-100 text-gray-600",
  success:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
  warning:  "bg-amber-50  text-amber-700  ring-1 ring-amber-200/60",
  danger:   "bg-red-50    text-red-700    ring-1 ring-red-200/60",
  purple:   "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
  gray:     "bg-gray-100  text-gray-500",
  blue:     "bg-sky-50    text-sky-700    ring-1 ring-sky-200/60",
};

const dots: Record<BadgeVariant, string> = {
  default: "bg-gray-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger:  "bg-red-500",
  purple:  "bg-violet-500",
  gray:    "bg-gray-400",
  blue:    "bg-sky-500",
};

export function Badge({
  children,
  variant = "default",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dots[variant])} />}
      {children}
    </span>
  );
}
