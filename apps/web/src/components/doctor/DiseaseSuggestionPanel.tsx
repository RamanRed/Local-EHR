import { useState } from "react";
import { AlertTriangle, Database, CheckSquare, ChevronRight, Pill, Plus, X } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SuggestResult, DiseaseEntry } from "@/hooks/useSuggestPipeline";

interface DiseaseSuggestionPanelProps {
  result: SuggestResult;
  onApplySelected: (
    diseases: { code: string; description: string }[],
  ) => void;
  onGenerateEmr?: (selectedIcdCodes: string[]) => void;
  isConfirming?: boolean;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: "bg-green-100 text-green-800 border-green-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-red-100 text-red-800 border-red-300",
};

/* ── Medication box with add support ── */
interface MedicationBoxProps {
  medications: DiseaseEntry["medications"];
  extraMeds: DiseaseEntry["medications"];
  onAddMed: (med: DiseaseEntry["medications"][0]) => void;
  onRemoveExtra: (index: number) => void;
}

function MedicationBox({ medications, extraMeds, onAddMed, onRemoveExtra }: MedicationBoxProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ generic_name: "", drug_class: "", dose: "", route: "Oral" });

  const allMeds = [...(medications || []), ...extraMeds];

  function handleAdd() {
    if (!form.generic_name.trim() || !form.dose.trim()) return;
    onAddMed({ ...form });
    setForm({ generic_name: "", drug_class: "", dose: "", route: "Oral" });
    setShowForm(false);
  }

  return (
    <div className="rounded-lg border-2 border-teal-200 bg-teal-50/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Pill className="h-4 w-4 text-teal-600" />
          <p className="font-semibold text-teal-800 text-sm">Medications</p>
          <Badge variant="secondary" className="text-[10px]">{allMeds.length}</Badge>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md bg-teal-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {showForm && (
        <div className="mb-3 rounded-md border border-teal-200 bg-white p-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Drug name *"
              value={form.generic_name}
              onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
            <input
              type="text"
              placeholder="Drug class"
              value={form.drug_class}
              onChange={(e) => setForm({ ...form, drug_class: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
            <input
              type="text"
              placeholder="Dose *"
              value={form.dose}
              onChange={(e) => setForm({ ...form, dose: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
            <select
              value={form.route}
              onChange={(e) => setForm({ ...form, route: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
            >
              <option>Oral</option>
              <option>IV</option>
              <option>IM</option>
              <option>Topical</option>
              <option>Inhaled</option>
              <option>Subcutaneous</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!form.generic_name.trim() || !form.dose.trim()}
              className="rounded bg-teal-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Medication
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded border border-gray-300 px-3 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {allMeds.length === 0 ? (
        <p className="text-xs text-teal-600/70 py-2 text-center">No medications yet. Click Add to prescribe.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-teal-200 text-left text-teal-700">
                <th className="pb-1 pr-3">Name</th>
                <th className="pb-1 pr-3">Class</th>
                <th className="pb-1 pr-3">Dose</th>
                <th className="pb-1 pr-3">Route</th>
                <th className="pb-1 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {(medications || []).map((m, i) => (
                <tr key={`ai-${i}`} className="border-b border-teal-100 last:border-0">
                  <td className="py-1.5 pr-3 font-medium text-gray-900">{m.generic_name}</td>
                  <td className="py-1.5 pr-3 text-gray-600">{m.drug_class}</td>
                  <td className="py-1.5 pr-3 text-gray-600">{m.dose}</td>
                  <td className="py-1.5 pr-3 text-gray-600">{m.route}</td>
                  <td className="py-1.5">
                    <Badge variant="outline" className="text-[9px] border-teal-300 text-teal-600">AI</Badge>
                  </td>
                </tr>
              ))}
              {extraMeds.map((m, i) => (
                <tr key={`doc-${i}`} className="border-b border-teal-100 last:border-0 bg-white/60">
                  <td className="py-1.5 pr-3 font-medium text-gray-900">{m.generic_name}</td>
                  <td className="py-1.5 pr-3 text-gray-600">{m.drug_class}</td>
                  <td className="py-1.5 pr-3 text-gray-600">{m.dose}</td>
                  <td className="py-1.5 pr-3 text-gray-600">{m.route}</td>
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => onRemoveExtra(i)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Detail panel for a single disease ── */
function DiseaseDetail({
  disease,
  extraMeds,
  onAddMed,
  onRemoveExtra,
}: {
  disease: DiseaseEntry;
  extraMeds: DiseaseEntry["medications"];
  onAddMed: (med: DiseaseEntry["medications"][0]) => void;
  onRemoveExtra: (index: number) => void;
}) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="text-base font-semibold text-gray-900">
          {disease.disease_name}
        </h4>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{disease.icd_10_code}</Badge>
          <Badge variant="secondary">{disease.specialty}</Badge>
          {disease.rank != null && (
            <Badge className="bg-primary text-white">#{disease.rank}</Badge>
          )}
          {disease.composite_score != null && (
            <span className="text-xs text-muted-foreground">
              Score: {disease.composite_score.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {disease.description && (
        <p className="text-gray-700">{disease.description}</p>
      )}

      {disease.source && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Source:</span> {disease.source}
        </div>
      )}
      {disease.rationale && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Rationale:</span> {disease.rationale}
        </div>
      )}

      {disease.symptoms?.length > 0 && (
        <div>
          <p className="mb-1.5 font-medium text-gray-800">Symptoms</p>
          <div className="flex flex-wrap gap-1.5">
            {disease.symptoms.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs text-gray-700"
              >
                {s.name}
                {s.severity && (
                  <span className="ml-1 text-muted-foreground">
                    ({s.severity})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {disease.treatments?.length > 0 && (
        <div>
          <p className="mb-1.5 font-medium text-gray-800">Treatments</p>
          <ul className="space-y-1">
            {disease.treatments.map((t, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-700">
                <span>{t.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {t.type}
                </Badge>
                {t.first_line && (
                  <Badge className="bg-green-100 text-[10px] text-green-800">
                    1st line
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Medications in a separate styled box */}
      <MedicationBox
        medications={disease.medications}
        extraMeds={extraMeds}
        onAddMed={onAddMed}
        onRemoveExtra={onRemoveExtra}
      />
    </div>
  );
}

export function DiseaseSuggestionPanel({
  result,
  onApplySelected,
  onGenerateEmr,
  isConfirming,
}: DiseaseSuggestionPanelProps) {
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    result.all_diseases
      .filter((d) => d.rank != null && d.rank <= 5)
      .forEach((d) => initial.add(d.icd_10_code));
    return initial;
  });

  const [focusedCode, setFocusedCode] = useState<string | null>(
    result.all_diseases[0]?.icd_10_code ?? null,
  );

  // Extra medications added by doctor, keyed by ICD code
  const [extraMeds, setExtraMeds] = useState<Record<string, DiseaseEntry["medications"]>>({});

  const focusedDisease = result.all_diseases.find(
    (d) => d.icd_10_code === focusedCode,
  );

  function toggleDisease(code: string) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleApply() {
    const selected = result.all_diseases
      .filter((d) => selectedCodes.has(d.icd_10_code))
      .map((d) => ({ code: d.icd_10_code, description: d.disease_name }));
    onApplySelected(selected);
  }

  function handleGenerateEmr() {
    if (onGenerateEmr) {
      onGenerateEmr(Array.from(selectedCodes));
    }
  }

  const confidenceClass =
    CONFIDENCE_COLORS[result.confidence_label] || CONFIDENCE_COLORS.LOW;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-base">AI Disease Suggestions</CardTitle>
          <Badge variant="outline" className={confidenceClass}>
            {result.confidence_label} ({(result.confidence_score * 100).toFixed(0)}%)
          </Badge>
          {result.data_source && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              {result.data_source}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Uncertainty warning */}
        {result.uncertainty_note && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{result.uncertainty_note}</span>
          </div>
        )}

        {result.all_diseases.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No disease suggestions returned.
          </p>
        )}

        {/* Master-detail split */}
        {result.all_diseases.length > 0 && (
          <div className="grid gap-4 md:grid-cols-[260px_1fr]">
            {/* Left: disease list */}
            <div className="max-h-[420px] space-y-1 overflow-y-auto rounded-lg border p-2">
              {result.all_diseases.map((disease) => {
                const isSelected = selectedCodes.has(disease.icd_10_code);
                const isFocused = focusedCode === disease.icd_10_code;

                return (
                  <div
                    key={disease.icd_10_code}
                    className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors cursor-pointer ${
                      isFocused
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    }`}
                    onClick={() => setFocusedCode(disease.icd_10_code)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleDisease(disease.icd_10_code);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900 text-xs">
                        {disease.disease_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {disease.icd_10_code}
                        {disease.rank != null && (
                          <span className="ml-1.5 text-primary font-medium">
                            #{disease.rank}
                          </span>
                        )}
                      </p>
                    </div>
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isFocused ? "text-primary" : "text-muted-foreground/40"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Right: detail panel */}
            <div className="max-h-[420px] overflow-y-auto rounded-lg border p-4">
              {focusedDisease ? (
                <DiseaseDetail
                  disease={focusedDisease}
                  extraMeds={extraMeds[focusedDisease.icd_10_code] || []}
                  onAddMed={(med) =>
                    setExtraMeds((prev) => ({
                      ...prev,
                      [focusedDisease.icd_10_code]: [
                        ...(prev[focusedDisease.icd_10_code] || []),
                        med,
                      ],
                    }))
                  }
                  onRemoveExtra={(idx) =>
                    setExtraMeds((prev) => ({
                      ...prev,
                      [focusedDisease.icd_10_code]: (
                        prev[focusedDisease.icd_10_code] || []
                      ).filter((_, i) => i !== idx),
                    }))
                  }
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Select a disease to view details
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {result.all_diseases.length > 0 && (
        <CardFooter className="flex flex-wrap gap-3">
          <Button onClick={handleApply} disabled={selectedCodes.size === 0}>
            <CheckSquare className="mr-2 h-4 w-4" />
            Apply {selectedCodes.size} Selected to ICD Codes
          </Button>
          {onGenerateEmr && (
            <Button
              variant="outline"
              onClick={handleGenerateEmr}
              disabled={selectedCodes.size === 0 || isConfirming}
            >
              {isConfirming ? "Generating EMR..." : "Generate FHIR EMR"}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
