import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
}

const iconBgMap: Record<string, string> = {
  "text-primary": "from-primary/20 to-primary/5",
  "text-amber-600": "from-amber-100 to-amber-50",
  "text-blue-600": "from-blue-100 to-blue-50",
  "text-green-600": "from-green-100 to-green-50",
  "text-red-600": "from-red-100 to-red-50",
  "text-indigo-600": "from-indigo-100 to-indigo-50",
  "text-fuchsia-600": "from-fuchsia-100 to-fuchsia-50",
  "text-violet-600": "from-violet-100 to-violet-50",
};

export function StatsCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-primary",
}: StatsCardProps) {
  const bg = iconBgMap[iconColor] || "from-muted to-muted";

  return (
    <Card className="group transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-default">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-200 group-hover:scale-105",
            bg,
            iconColor
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-[13px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
