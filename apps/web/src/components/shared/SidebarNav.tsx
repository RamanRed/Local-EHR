import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  CalendarHeart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@vox/shared-types";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  roles?: Role[];
}

interface SidebarNavProps {
  homePath: string;
  role?: Role;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "" },
  {
    label: "Appointments",
    icon: CalendarCheck,
    path: "/appointments",
    roles: ["DOCTOR"],
  },
  { label: "Patient Records", icon: ClipboardList, path: "/history" },
  { label: "Follow-Ups", icon: CalendarHeart, path: "/follow-ups" },
];

export function SidebarNav({ homePath, role }: SidebarNavProps) {
  const { pathname } = useLocation();

  const items = navItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <nav className="flex-1 px-3 pt-4">
      <div className="mb-3 px-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
          Navigation
        </span>
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const to = homePath + item.path;
          const isActive =
            item.path === ""
              ? pathname === homePath
              : pathname.startsWith(to);

          return (
            <Link
              key={item.label}
              to={to}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium cursor-pointer transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full gradient-accent" />
              )}
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] flex-shrink-0 transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/60 group-hover:text-foreground group-hover:scale-110"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
