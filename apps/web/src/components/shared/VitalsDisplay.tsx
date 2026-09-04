import type { Vitals } from "@vox/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Heart,
  Thermometer,
  Droplets,
  Activity,
  Weight,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VitalsDisplayProps {
  vitals: Vitals;
}

interface VitalItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  unit: string;
  colorClass?: string;
}

const vitalColors: Record<string, { icon: string; bg: string }> = {
  bloodPressure: { icon: "text-rose-600", bg: "bg-rose-50" },
  heartRate: { icon: "text-red-500", bg: "bg-red-50" },
  temperature: { icon: "text-orange-500", bg: "bg-orange-50" },
  spo2: { icon: "text-blue-500", bg: "bg-blue-50" },
  bloodGlucose: { icon: "text-purple-500", bg: "bg-purple-50" },
  weight: { icon: "text-emerald-500", bg: "bg-emerald-50" },
  height: { icon: "text-cyan-500", bg: "bg-cyan-50" },
};

function VitalItem({ icon: Icon, label, value, unit, colorClass = "bloodPressure" }: VitalItemProps) {
  if (value == null) return null;
  const colors = vitalColors[colorClass] || vitalColors.bloodPressure;

  return (
    <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", colors.bg)}>
        <Icon className={cn("h-4 w-4", colors.icon)} />
      </div>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-foreground">
          {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </p>
      </div>
    </div>
  );
}

export function VitalsDisplay({ vitals }: VitalsDisplayProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-semibold">Vitals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-1">
          <VitalItem
            icon={Activity}
            label="Blood Pressure"
            value={vitals.bloodPressure}
            unit="mmHg"
            colorClass="bloodPressure"
          />
          <VitalItem
            icon={Heart}
            label="Heart Rate"
            value={vitals.heartRate}
            unit="bpm"
            colorClass="heartRate"
          />
          <VitalItem
            icon={Thermometer}
            label="Temperature"
            value={vitals.temperature}
            unit="°F"
            colorClass="temperature"
          />
          <VitalItem
            icon={Droplets}
            label="SpO2"
            value={vitals.oxygenSat}
            unit="%"
            colorClass="spo2"
          />
          <VitalItem
            icon={Droplets}
            label="Blood Glucose"
            value={vitals.bloodGlucose}
            unit="mg/dL"
            colorClass="bloodGlucose"
          />
          <VitalItem
            icon={Weight}
            label="Weight"
            value={vitals.weight}
            unit="kg"
            colorClass="weight"
          />
          <VitalItem
            icon={Ruler}
            label="Height"
            value={vitals.height}
            unit="cm"
            colorClass="height"
          />
        </div>
      </CardContent>
    </Card>
  );
}
