import { useState } from "react";
import { ChevronDown, ChevronUp, Pill, Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DiseaseEntry } from "@/hooks/useSuggestPipeline";

/* ── Medication box for DiseaseCard ── */
function MedicationCardBox({ medications }: { medications: DiseaseEntry["medications"] }) {
  const [extraMeds, setExtraMeds] = useState<DiseaseEntry["medications"]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ generic_name: "", drug_class: "", dose: "", route: "Oral" });

  const allMeds = [...(medications || []), ...extraMeds];

  function handleAdd() {
    if (!form.generic_name.trim() || !form.dose.trim()) return;
    setExtraMeds((prev) => [...prev, { ...form }]);
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
                      onClick={() => setExtraMeds((prev) => prev.filter((_, idx) => idx !== i))}
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

interface DiseaseCardProps {
  disease: DiseaseEntry;
  selected: boolean;
  onToggle: () => void;
  defaultExpanded: boolean;
}

export function DiseaseCard({
  disease,
  selected,
  onToggle,
  defaultExpanded,
}: DiseaseCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card className={selected ? "border-primary/50 bg-primary/5" : ""}>
      <div className="flex items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {disease.disease_name}
            </span>
            <Badge variant="outline" className="text-xs">
              {disease.icd_10_code}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {disease.specialty}
            </Badge>
            {disease.rank != null && (
              <Badge className="bg-primary text-xs text-white">
                #{disease.rank}
              </Badge>
            )}
            {disease.composite_score != null && (
              <span className="text-xs text-muted-foreground">
                Score: {disease.composite_score.toFixed(2)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-gray-700"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Hide details
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Show details
              </>
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <CardContent className="border-t pt-4">
          <div className="space-y-4 text-sm">
            {/* Description */}
            {disease.description && (
              <p className="text-gray-700">{disease.description}</p>
            )}

            {/* Source & Rationale */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {disease.source && <span>Source: {disease.source}</span>}
              {disease.rationale && <span>Rationale: {disease.rationale}</span>}
            </div>

            {/* Symptoms */}
            {disease.symptoms?.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-gray-800">Symptoms</p>
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

            {/* Treatments */}
            {disease.treatments?.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-gray-800">Treatments</p>
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

            {/* Medications — separate styled box */}
            <MedicationCardBox medications={disease.medications} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
