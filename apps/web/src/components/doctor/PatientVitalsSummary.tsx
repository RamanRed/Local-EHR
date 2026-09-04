import type { Vitals } from "@vox/shared-types";

interface PatientVitalsSummaryProps {
  vitals: Vitals | null | undefined;
}

export function PatientVitalsSummary({ vitals }: PatientVitalsSummaryProps) {
  if (!vitals) {
    return <span className="text-muted-foreground">No vitals</span>;
  }

  const parts: string[] = [];
  if (vitals.bloodPressure) parts.push(`BP ${vitals.bloodPressure}`);
  if (vitals.heartRate) parts.push(`HR ${vitals.heartRate}`);
  if (vitals.temperature) parts.push(`${vitals.temperature}°F`);
  if (vitals.oxygenSat) parts.push(`SpO2 ${vitals.oxygenSat}%`);

  if (parts.length === 0) {
    return <span className="text-muted-foreground">No vitals</span>;
  }

  return (
    <span className="text-sm text-muted-foreground">{parts.join(" · ")}</span>
  );
}
