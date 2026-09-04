import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, LogOut, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  name: string;
  designation: string;
  settingsPath: string;
  onLogout: () => void;
}

export function UserMenu({ name, designation, settingsPath, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative px-3 py-3">
      <div className="border-t border-border/40 pt-3">
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-[11px] font-bold text-primary ring-2 ring-primary/10">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {designation}
            </p>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="User menu"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl border border-border/60 bg-card py-1.5 shadow-lg animate-slide-down">
          <button
            onClick={() => {
              setOpen(false);
              navigate(settingsPath);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted cursor-pointer rounded-lg mx-0"
          >
            <UserCircle className="h-4 w-4 text-muted-foreground" />
            Profile
          </button>
          <div className="mx-3 my-1">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium cursor-pointer rounded-lg mx-0",
              "text-red-600 transition-colors hover:bg-red-50"
            )}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
