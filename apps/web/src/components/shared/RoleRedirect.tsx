import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store";

export function RoleRedirect() {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/signin" replace />;
  if (user.role === "NURSE") return <Navigate to="/nurse" replace />;
  if (user.role === "DOCTOR") return <Navigate to="/doctor" replace />;
  return <Navigate to="/patient" replace />;
}
