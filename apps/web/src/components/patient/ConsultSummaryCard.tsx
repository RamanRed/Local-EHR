import type { Consult } from "@vox/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Stethoscope } from "lucide-react";
import { ConsultDetailDialog } from "@/components/patient/ConsultDetailDialog";

interface ConsultSummaryCardProps {
  consult: Consult;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ConsultSummaryCard({ consult }: ConsultSummaryCardProps) {
  return (
    <ConsultDetailDialog consult={consult}>
    <Card className="cursor-pointer transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Consultation -{formatDate(consult.createdAt)}
          </CardTitle>
          <Badge variant={consult.finalized ? "default" : "secondary"}>
            {consult.finalized ? "Finalized" : "In Progress"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Stethoscope className="h-3.5 w-3.5" />
          Doctor consultation
        </div>

        {consult.patientSummary && (
          <p className="text-sm text-foreground">{consult.patientSummary}</p>
        )}

        {consult.icdCodes && consult.icdCodes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {consult.icdCodes.map((icd) => (
              <span
                key={icd.code}
                className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs text-primary"
              >
                {icd.code} -{icd.description}
              </span>
            ))}
          </div>
        )}

        {consult.followUpDate && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <CalendarDays className="h-3.5 w-3.5" />
            Follow-up: {formatDate(consult.followUpDate)}
          </div>
        )}
      </CardContent>
    </Card>
    </ConsultDetailDialog>
  );
}
