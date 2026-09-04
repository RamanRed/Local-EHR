import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  label: string;
  icon: LucideIcon;
  color: string;
}

const gradientMap: Record<string, string> = {
  "bg-teal-600": "from-teal-500 to-teal-700",
  "bg-blue-600": "from-blue-500 to-blue-700",
  "bg-emerald-600": "from-emerald-500 to-emerald-700",
};

export function RoleBadge({ label, icon: Icon, color }: RoleBadgeProps) {
  const gradient = gradientMap[color] || "from-primary to-primary";

  return (
    <div className="px-5 pb-2">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm",
          gradient
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
    </div>
  );
}
