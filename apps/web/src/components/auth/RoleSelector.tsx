import { ClipboardPlus, Stethoscope, User } from "lucide-react";
import type { Role } from "@vox/shared-types";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { LucideIcon } from "lucide-react";

const roles: { value: Role; label: string; desc: string; icon: LucideIcon }[] = [
  { value: "NURSE", label: "Nurse", desc: "Triage & data collection", icon: ClipboardPlus },
  { value: "DOCTOR", label: "Doctor", desc: "Consultation & diagnosis", icon: Stethoscope },
  { value: "PATIENT", label: "Patient", desc: "View summaries", icon: User },
];

interface RoleSelectorProps {
  selected?: Role;
  onSelect: (role: Role) => void;
  error?: string;
}

export function RoleSelector({ selected, onSelect, error }: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>I am a</Label>
      <div className="grid grid-cols-3 gap-3">
        {roles.map((r) => {
          const Icon = r.icon;
          const isSelected = selected === r.value;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => onSelect(r.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3.5 text-center transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{r.desc}</p>
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
