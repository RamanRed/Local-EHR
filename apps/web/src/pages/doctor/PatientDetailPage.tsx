import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Calendar,
  FileText,
} from "lucide-react";
import type { Patient, Consult, IcdCode } from "@vox/shared-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientInfoCard } from "@/components/shared/PatientInfoCard";
import { VitalsDisplay } from "@/components/shared/VitalsDisplay";
import { SymptomsDisplay } from "@/components/shared/SymptomsDisplay";
import { patientApi, consultApi } from "@/services/api";

/* ── Consult detail (expanded row) ── */
function ConsultDetail({ consult }: { consult: Consult }) {
  const icdCodes = (consult.icdCodes as IcdCode[] | null) || [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {consult.soapSubjective && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Subjective
          </p>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
            {consult.soapSubjective}
          </p>
        </div>
      )}
      {consult.soapObjective && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Objective
          </p>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
            {consult.soapObjective}
          </p>
        </div>
      )}
      {consult.soapAssessment && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Assessment
          </p>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
            {consult.soapAssessment}
          </p>
        </div>
      )}
      {consult.soapPlan && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Plan
          </p>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
            {consult.soapPlan}
          </p>
        </div>
      )}

      {icdCodes.length > 0 && (
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            ICD-10 Codes
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {icdCodes.map((icd) => (
              <span
                key={icd.code}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs"
              >
                <span className="font-medium">{icd.code}</span>
                <span className="text-muted-foreground">{icd.description}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {consult.patientSummary && (
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Patient Summary
          </p>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
            {consult.patientSummary}
          </p>
        </div>
      )}

      {consult.prescription && (
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prescription
          </p>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
            {consult.prescription}
          </p>
        </div>
      )}

      {consult.followUpDate && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Follow-up Date
          </p>
          <p className="mt-1 text-sm text-gray-700">
            {new Date(consult.followUpDate).toLocaleDateString()}
          </p>
        </div>
      )}

      {!consult.soapSubjective &&
        !consult.soapAssessment &&
        !consult.patientSummary &&
        icdCodes.length === 0 && (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            No detailed notes recorded for this consultation.
          </p>
        )}
    </div>
  );
}

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [consults, setConsults] = useState<Consult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;

    setLoading(true);
    Promise.all([
      patientApi.getById(patientId),
      consultApi.getByPatient(patientId),
    ])
      .then(([p, c]) => {
        setPatient(p);
        setConsults(c);
      })
      .catch((e) =>
        setError(e.response?.data?.message || "Failed to load patient data"),
      )
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading patient data...
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <p className="text-red-500">{error || "Patient not found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {patient.name}
          </h1>
          <p className="text-xs text-muted-foreground">Patient Details</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Left: Patient info */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <PatientInfoCard patient={patient} />
          {patient.vitals && <VitalsDisplay vitals={patient.vitals} />}
          {patient.vitals && patient.vitals.symptoms.length > 0 && (
            <SymptomsDisplay symptoms={patient.vitals.symptoms} />
          )}
        </div>

        {/* Right: Consultation history */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Consultation History
            <span className="text-sm font-normal text-muted-foreground">
              ({consults.length})
            </span>
          </h2>

          {consults.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No consultations recorded for this patient.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {consults.map((c) => {
                const icdCodes = (c.icdCodes as IcdCode[] | null) || [];
                const isExpanded = expandedId === c.id;

                return (
                  <Card key={c.id}>
                    {/* Clickable header */}
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : c.id)
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {new Date(c.createdAt).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              c.finalized
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {c.finalized ? "Finalized" : "In Progress"}
                          </span>
                          {c.isFollowUp && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                              Follow-up
                            </span>
                          )}
                        </div>
                        {icdCodes.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {icdCodes.slice(0, 4).map((icd) => (
                              <span
                                key={icd.code}
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600"
                              >
                                {icd.code}
                              </span>
                            ))}
                            {icdCodes.length > 4 && (
                              <span className="text-[11px] text-muted-foreground">
                                +{icdCodes.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <CardContent className="border-t pt-4">
                        <ConsultDetail consult={c} />
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
