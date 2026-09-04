import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  children,
}: PageHeaderProps) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {children}
          {actionLabel && onAction && (
            <Button onClick={onAction} size="sm" className="cursor-pointer shadow-sm">
              {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
      <div className="mt-1 h-[2px] w-16 rounded-full gradient-accent opacity-60" />
    </div>
  );
}
