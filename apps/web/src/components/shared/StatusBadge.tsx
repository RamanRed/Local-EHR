import type { PatientStatus } from "@vox/shared-types";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  PatientStatus,
  { label: string; className: string; pulse?: boolean }
> = {
  WAITING: {
    label: "Waiting",
    className: "bg-amber-50 text-amber-700 border-amber-200/80",
  },
  EMERGENCY: {
    label: "Emergency",
    className: "bg-red-50 text-red-700 border-red-200/80",
    pulse: true,
  },
  IN_CONSULT: {
    label: "In Consult",
    className: "bg-blue-50 text-blue-700 border-blue-200/80",
    pulse: true,
  },
  UNDER_TREATMENT: {
    label: "Under Treatment",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  },
  CURED: {
    label: "Cured",
    className: "bg-green-50 text-green-700 border-green-200/80",
  },
};

const dotColorMap: Record<string, string> = {
  EMERGENCY: "bg-red-500",
  IN_CONSULT: "bg-blue-500",
};

interface StatusBadgeProps {
  status: PatientStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className
      )}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", dotColorMap[status])} />
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", dotColorMap[status])} />
        </span>
      )}
      {config.label}
    </span>
  );
}
