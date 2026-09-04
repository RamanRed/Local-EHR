import { useNavigate } from "react-router-dom";
import { ClipboardPlus, Stethoscope, User } from "lucide-react";
import type { UserPublic } from "@vox/shared-types";
import { useAuthStore } from "@/store";
import { Logo } from "./Logo";
import { RoleBadge } from "./RoleBadge";
import { SidebarNav } from "./SidebarNav";
import { UserMenu } from "./UserMenu";

const roleConfig = {
  NURSE: {
    label: "Nurse",
    icon: ClipboardPlus,
    home: "/nurse",
    color: "bg-teal-600",
  },
  DOCTOR: {
    label: "Doctor",
    icon: Stethoscope,
    home: "/doctor",
    color: "bg-blue-600",
  },
  PATIENT: {
    label: "Patient",
    icon: User,
    home: "/patient",
    color: "bg-emerald-600",
  },
} as const;

interface SidebarProps {
  user: UserPublic;
}

export function Sidebar({ user }: SidebarProps) {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const config = roleConfig[user.role];

  const handleLogout = () => {
    clearAuth();
    navigate("/signin", { replace: true });
  };

  return (
    <aside className="sidebar-glow flex w-[260px] flex-col border-r border-border/40 bg-white/80 backdrop-blur-sm">
      <Logo />
      <div className="mx-5 mb-2">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
      <RoleBadge label={config.label} icon={config.icon} color={config.color} />
      <SidebarNav homePath={config.home} role={user.role} />
      <UserMenu name={user.name} designation={config.label} settingsPath={`${config.home}/settings`} onLogout={handleLogout} />
    </aside>
  );
}
