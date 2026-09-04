import { Outlet } from "react-router-dom";
import { useAuthStore } from "@/store";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto gradient-surface">
        <div className="mx-auto max-w-6xl px-8 py-7 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
