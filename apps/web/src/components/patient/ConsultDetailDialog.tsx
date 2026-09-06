import type { ReactNode } from "react";
import type { Consult } from "@vox/shared-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Stethoscope, Pill, ClipboardList } from "lucide-react";

interface ConsultDetailDialogProps {
  consult: Consult;
  children: ReactNode; // the trigger element (e.g. a Card)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

export function ConsultDetailDialog({ consult, children }: ConsultDetailDialogProps) {
  const hasSoap =
    consult.soapSubjective || consult.soapObjective || consult.soapAssessment || consult.soapPlan;

  return (
    <Dialog>
      <DialogTrigger asChild className="cursor-pointer">
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Consultation — {formatDate(consult.createdAt)}</DialogTitle>
            <Badge variant={consult.finalized ? "default" : "secondary"}>
              {consult.finalized ? "Finalized" : "In Progress"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {consult.patientSummary && (
            <Section title="Summary">
              <p>{consult.patientSummary}</p>
            </Section>
          )}

          {consult.icdCodes && consult.icdCodes.length > 0 && (
            <Section title="Diagnoses">
              <div className="flex flex-wrap gap-1.5">
                {consult.icdCodes.map((icd) => (
                  <span
                    key={icd.code}
                    className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs text-primary"
                  >
                    {icd.code} — {icd.description}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {hasSoap && (
            <Section title="Clinical Notes">
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                {consult.soapSubjective && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Subjective</p>
                    <p>{consult.soapSubjective}</p>
                  </div>
                )}
                {consult.soapObjective && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Objective</p>
                    <p>{consult.soapObjective}</p>
                  </div>
                )}
                {consult.soapAssessment && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Assessment</p>
                    <p>{consult.soapAssessment}</p>
                  </div>
                )}
                {consult.soapPlan && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Plan</p>
                    <p>{consult.soapPlan}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {consult.symptoms && (
            <Section title="Reported Symptoms">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                <p>{consult.symptoms}</p>
              </div>
            </Section>
          )}

          {consult.prescription && (
            <Section title="Prescription">
              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Pill className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <p className="whitespace-pre-line">{consult.prescription}</p>
              </div>
            </Section>
          )}

          {consult.progressNote && (
            <Section title="Progress Note">
              <div className="flex items-start gap-2">
                <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="whitespace-pre-line">{consult.progressNote}</p>
              </div>
            </Section>
          )}

          {consult.followUpDate && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <CalendarDays className="h-3.5 w-3.5" />
              Follow-up: {formatDate(consult.followUpDate)}
            </div>
          )}

          {consult.transcript && (
            <Section title="Consultation Transcript">
              <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                {consult.transcript}
              </p>
            </Section>
          )}

          {!consult.patientSummary && !hasSoap && !consult.prescription && !consult.progressNote && (
            <p className="text-sm text-muted-foreground">No additional details recorded for this consultation.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
