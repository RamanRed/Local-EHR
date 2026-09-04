import type { Patient } from "@vox/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Droplets, AlertCircle, CreditCard } from "lucide-react";
import { getAge } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface PatientInfoCardProps {
  patient: Patient;
}

export function PatientInfoCard({ patient }: PatientInfoCardProps) {
  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-semibold">Patient Info</CardTitle>
          <StatusBadge status={patient.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-bold text-primary ring-2 ring-primary/10">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-foreground">{patient.name}</p>
            <p className="text-sm text-muted-foreground">
              {getAge(patient.dob)} yrs &middot; {patient.gender}
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {patient.phone && (
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span>{patient.phone}</span>
            </div>
          )}
          {patient.aadhaarNumber && (
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span>Aadhaar: {patient.aadhaarNumber}</span>
            </div>
          )}
          {patient.bloodGroup && (
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Droplets className="h-3.5 w-3.5 text-red-400" />
              <span>Blood Group: <span className="font-semibold text-foreground">{patient.bloodGroup}</span></span>
            </div>
          )}
          {patient.emergencyContact && (
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <span>Emergency: {patient.emergencyContact}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
