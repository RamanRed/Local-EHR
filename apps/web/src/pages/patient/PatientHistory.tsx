import { usePatientHistory } from "@/hooks/usePatientHistory";
import type { IcdCode } from "@vox/shared-types";
import { ConsultDetailDialog } from "@/components/patient/ConsultDetailDialog";

export default function PatientHistory() {
  const { consults, loading, error } = usePatientHistory();

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading history...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Consultation History</h1>

      {consults.length === 0 ? (
        <p className="text-muted-foreground">No finalized consultations yet.</p>
      ) : (
        <div className="space-y-4">
          {consults.map((c) => {
            const icdCodes = (c.icdCodes as IcdCode[] | null) || [];
            return (
              <ConsultDetailDialog key={c.id} consult={c}>
              <div
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Finalized
                  </span>
                </div>

                {c.patientSummary && (
                  <p className="mb-3 text-sm leading-relaxed">{c.patientSummary}</p>
                )}

                {icdCodes.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Diagnoses</p>
                    <div className="flex flex-wrap gap-1.5">
                      {icdCodes.map((icd) => (
                        <span
                          key={icd.code}
                          className="rounded bg-gray-100 px-2 py-0.5 text-xs"
                        >
                          {icd.code} -{icd.description}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {c.followUpDate && (
                  <p className="text-xs text-muted-foreground">
                    Follow-up: {new Date(c.followUpDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              </ConsultDetailDialog>
            );
          })}
        </div>
      )}
    </div>
  );
}
