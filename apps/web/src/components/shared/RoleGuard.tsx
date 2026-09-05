import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store";
import type { Role } from "@vox/shared-types";

interface RoleGuardProps {
  allowedRoles: Role[];
}

/**
 * Prevents users from accessing routes that don't match their role.
 * If the user's role is not in allowedRoles, they are redirected to
 * their correct home page.
 */
export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/signin" replace />;

  if (!allowedRoles.includes(user.role)) {
    // Redirect to the user's own home page
    const homeMap: Record<Role, string> = {
      NURSE: "/nurse",
      DOCTOR: "/doctor",
      PATIENT: "/patient",
    };
    return <Navigate to={homeMap[user.role]} replace />;
  }

  return <Outlet />;
}
