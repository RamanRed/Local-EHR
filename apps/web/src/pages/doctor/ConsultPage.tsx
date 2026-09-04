import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ClipboardCheck,
  Search,
  Loader2,
  Mic,
  FileText,
  Stethoscope,
  CheckCircle,
  Check,
} from "lucide-react";
import type { IcdCode } from "@vox/shared-types";
import { Button } from "@/components/ui/button";
import { PatientInfoCard } from "@/components/shared/PatientInfoCard";
import { VitalsDisplay } from "@/components/shared/VitalsDisplay";
import { SymptomsDisplay } from "@/components/shared/SymptomsDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { TranscriptPanel } from "@/components/doctor/TranscriptPanel";
import { SOAPEditor } from "@/components/doctor/SOAPEditor";
import { ICDSuggestions } from "@/components/doctor/ICDSuggestions";
import { ConsultActions } from "@/components/doctor/ConsultActions";
import { DiseaseSuggestionPanel } from "@/components/doctor/DiseaseSuggestionPanel";
import { usePatient } from "@/hooks/usePatient";
import { useConsult } from "@/hooks/useConsult";
import { useAiAnalyze } from "@/hooks/useAiAnalyze";
import { useSuggestPipeline } from "@/hooks/useSuggestPipeline";
import { aiApi } from "@/services/api";

/* ── Step definitions ── */
const STEPS = [
  { id: 0, label: "Record", icon: Mic },
  { id: 1, label: "Diagnose", icon: Stethoscope },
  { id: 2, label: "Notes", icon: FileText },
  { id: 3, label: "Finalize", icon: CheckCircle },
] as const;

/* ── Stepper indicator ── */
function Stepper({
  current,
  onNavigate,
}: {
  current: number;
  onNavigate: (step: number) => void;
}) {
  return (
    <nav className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === current;
        const isDone = i < current;

        return (
          <div key={step.id} className="flex items-center">
            {i > 0 && (
              <div
                className={`mx-1.5 hidden h-[2px] w-10 sm:block rounded-full transition-all duration-300 ${isDone ? "gradient-accent" : "bg-border"
                  }`}
              />
            )}
            <button
              type="button"
              onClick={() => onNavigate(i)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold cursor-pointer transition-all duration-200 ${isActive
                  ? "gradient-accent text-white shadow-glow-primary"
                  : isDone
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
            >
              {isDone ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

function normalizeSymptomsInput(symptoms: unknown): string[] {
  if (Array.isArray(symptoms)) {
    return symptoms
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof symptoms !== "string") return [];

  const raw = symptoms.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } catch {
    // Fall through to comma-separated parsing.
  }

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ConsultPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const { patient, isLoading: patientLoading } = usePatient(patientId);
  const { consult, createConsult, updateConsult, isLoading: consultLoading } = useConsult();
  const { analyze, isAnalyzing } = useAiAnalyze();
  const {
    suggestDiseases,
    confirmDiseases,
    isSuggesting,
    isConfirming,
    suggestResult,
    suggestError,
  } = useSuggestPipeline();

  const [step, setStep] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [soap, setSoap] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [cleanedSymptoms, setCleanedSymptoms] = useState<string[]>([]);
  const [icdSuggestions, setIcdSuggestions] = useState<IcdCode[]>([]);
  const [selectedIcds, setSelectedIcds] = useState<IcdCode[]>([]);
  const [patientSummary, setPatientSummary] = useState("");
  const [isFollowUpEnabled, setIsFollowUpEnabled] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const initialStatusRef = useRef<string>("WAITING");
  const finalizedRef = useRef(false);

  useEffect(() => {
    if (patient && patient.status !== "IN_CONSULT" && initialStatusRef.current === "WAITING") {
      initialStatusRef.current = patient.status;
    }
  }, [patient]);

  const creatingRef = useRef(false);
  useEffect(() => {
    if (patient && !consult && patientId && !creatingRef.current) {
      creatingRef.current = true;
      createConsult(patientId).catch(() => {
        creatingRef.current = false;
      });
    }
  }, [patient, consult, patientId]);

  // Handle SPA navigation out
  useEffect(() => {
    return () => {
      if (!finalizedRef.current && creatingRef.current && patientId) {
        const revertTo = initialStatusRef.current === "EMERGENCY" ? "EMERGENCY" : "WAITING";
        const token = localStorage.getItem("token");
        fetch(`/api/patients/${patientId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: revertTo }),
          keepalive: true,
        }).catch(() => { });
      }
    };
  }, [patientId]);

  // Handle browser tab closing or hard refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!finalizedRef.current && creatingRef.current && patientId) {
        const revertTo = initialStatusRef.current === "EMERGENCY" ? "EMERGENCY" : "WAITING";
        const token = localStorage.getItem("token");
        fetch(`/api/patients/${patientId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: revertTo }),
          keepalive: true,
        }).catch(() => { });
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [patientId]);

  /* ── Loading / not found ── */
  if (patientLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading patient data...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/doctor")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <EmptyState
          title="Patient not found"
          description="The patient you're looking for doesn't exist."
        />
      </div>
    );
  }

  const patientSymptoms = normalizeSymptomsInput(
    (patient.vitals as { symptoms?: unknown } | null | undefined)?.symptoms,
  );

  /* ── Handlers ── */
  async function handleAnalyze() {
    try {
      const result = await analyze({
        transcript,
        symptoms: patientSymptoms,
        vitals: patient!.vitals
          ? {
            bloodPressure: patient!.vitals.bloodPressure,
            heartRate: patient!.vitals.heartRate,
            temperature: patient!.vitals.temperature,
            oxygenSat: patient!.vitals.oxygenSat,
            bloodGlucose: patient!.vitals.bloodGlucose,
          }
          : undefined,
        previousSummary: patient!.consultSummary || undefined,
      });
      setCleanedSymptoms(result.cleanedSymptoms || []);
      setSoap(result.soap);
      setIcdSuggestions(result.icdSuggestions);
      goToStep(1); // auto-advance to Diagnose
    } catch {
      // error handled by hook
    }
  }

  async function handleSuggestDiseases() {
    try {
      await suggestDiseases(cleanedSymptoms.join(", "));
    } catch {
      // error handled by hook
    }
  }

  function handleApplyDiseases(diseases: { code: string; description: string }[]) {
    const existingCodes = new Set(icdSuggestions.map((s) => s.code));
    const newSuggestions = diseases
      .filter((d) => !existingCodes.has(d.code))
      .map((d) => ({ code: d.code, description: d.description }));
    setIcdSuggestions((prev) => [...prev, ...newSuggestions]);

    const existingSelected = new Set(selectedIcds.map((s) => s.code));
    const newSelected = diseases
      .filter((d) => !existingSelected.has(d.code))
      .map((d) => ({ code: d.code, description: d.description }));
    setSelectedIcds((prev) => [...prev, ...newSelected]);
  }

  async function handleGenerateEmr(selectedIcdCodes: string[]) {
    if (!suggestResult) return;
    try {
      await confirmDiseases(
        suggestResult.session_id,
        selectedIcdCodes,
        patient
          ? { name: patient.name, id: patient.id, gender: patient.gender }
          : undefined,
        patient?.vitals
          ? {
            bloodPressure: patient.vitals.bloodPressure,
            heartRate: patient.vitals.heartRate,
            temperature: patient.vitals.temperature,
            oxygenSat: patient.vitals.oxygenSat,
          }
          : undefined,
      );
    } catch {
      // error handled by hook
    }
  }

  function handleToggleIcd(code: IcdCode) {
    setSelectedIcds((prev) => {
      const exists = prev.some((c) => c.code === code.code);
      if (exists) return prev.filter((c) => c.code !== code.code);
      return [...prev, code];
    });
  }

  function handleAddIcd(code: IcdCode) {
    setIcdSuggestions((prev) => {
      if (prev.some((c) => c.code === code.code)) return prev;
      return [...prev, code];
    });
  }

  async function handleGenerateSummary() {
    setIsGeneratingSummary(true);
    try {
      const result = await aiApi.summarize({
        soap,
        icdCodes: selectedIcds.length > 0 ? selectedIcds : undefined,
        symptoms: cleanedSymptoms.length > 0 ? cleanedSymptoms : undefined,
        patientName: patient?.name,
      });
      setPatientSummary(result.summary);
    } catch {
      // silently fail — doctor can write manually
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  async function handleFinalize() {
    if (!consult) return;
    try {
      await updateConsult(consult.id, {
        transcript,
        soapSubjective: soap.subjective,
        soapObjective: soap.objective,
        soapAssessment: soap.assessment,
        soapPlan: soap.plan,
        icdCodes: selectedIcds,
        patientSummary: patientSummary || undefined,
        followUpDate: isFollowUpEnabled && followUpDate ? followUpDate : undefined,
        finalized: true,
      });
      finalizedRef.current = true;
      navigate("/doctor");
    } catch {
      // error handled by hook
    }
  }

  const canFinalize =
    !!consult &&
    soap.subjective.trim() !== "" &&
    soap.assessment.trim() !== "" &&
    soap.plan.trim() !== "" &&
    (!isFollowUpEnabled || followUpDate.trim() !== "") &&
    !consultLoading;

  function goToStep(target: number) {
    setStep(target);
    // Auto-generate summary when entering Finalize step with SOAP content
    if (target === 3 && !patientSummary.trim() && soap.assessment.trim()) {
      handleGenerateSummary();
    }
  }

  /* ── Render ── */
  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/doctor")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Consultation — {patient.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {STEPS[step].label} (step {step + 1} of {STEPS.length})
            </p>
          </div>
        </div>
        <Stepper current={step} onNavigate={goToStep} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left column: Patient context — always visible */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <PatientInfoCard patient={patient} />
          {patient.vitals && <VitalsDisplay vitals={patient.vitals} />}
          {patient.vitals && patientSymptoms.length > 0 && (
            <SymptomsDisplay symptoms={patientSymptoms} />
          )}
          {patient.consultSummary && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-2">Previous History</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {patient.consultSummary}
              </p>
            </div>
          )}
        </aside>

        {/* Right column: Current step content */}
        <div className="min-h-[400px]">

          {/* ──────── Step 0: Record ──────── */}
          {step === 0 && (
            <div className="space-y-4">
              <TranscriptPanel transcript={transcript} onChange={setTranscript} />

              <div className="flex gap-3">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !transcript.trim()}
                  className="flex-1"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToStep(2)}
                  disabled={!transcript.trim()}
                >
                  Skip to Notes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ──────── Step 1: Diagnose ──────── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Cleaned symptoms */}
              {cleanedSymptoms.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                    <ClipboardCheck className="h-4 w-4" />
                    Identified Symptoms
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cleanedSymptoms.map((symptom, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full border border-primary/30 bg-white px-3 py-1 text-sm text-gray-800"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Disease suggestion trigger */}
              {cleanedSymptoms.length > 0 && !suggestResult && (
                <Button
                  onClick={handleSuggestDiseases}
                  disabled={isSuggesting}
                  variant="outline"
                  className="w-full"
                >
                  {isSuggesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing diseases...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Get Disease Suggestions
                    </>
                  )}
                </Button>
              )}

              {suggestError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {suggestError}
                </div>
              )}

              {suggestResult && (
                <DiseaseSuggestionPanel
                  result={suggestResult}
                  onApplySelected={handleApplyDiseases}
                  onGenerateEmr={handleGenerateEmr}
                  isConfirming={isConfirming}
                />
              )}

              {/* ICD codes */}
              <ICDSuggestions
                suggestions={icdSuggestions}
                selected={selectedIcds}
                onToggle={handleToggleIcd}
                onAdd={handleAddIcd}
              />

              {/* Empty state if no analysis yet */}
              {cleanedSymptoms.length === 0 && icdSuggestions.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                  <Stethoscope className="mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No analysis yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Go back to Record and analyze the transcript first.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => goToStep(0)}
                  >
                    <ArrowLeft className="mr-2 h-3 w-3" />
                    Back to Record
                  </Button>
                </div>
              )}

              {/* Navigation */}
              {(cleanedSymptoms.length > 0 || icdSuggestions.length > 0) && (
                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => goToStep(0)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={() => goToStep(2)}>
                    Continue to Notes
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ──────── Step 2: SOAP Notes ──────── */}
          {step === 2 && (
            <div className="space-y-4">
              <SOAPEditor
                values={soap}
                onChange={(field, value) =>
                  setSoap((prev) => ({ ...prev, [field]: value }))
                }
              />

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => goToStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => goToStep(3)}>
                  Continue to Finalize
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ──────── Step 3: Finalize ──────── */}
          {step === 3 && (
            <div className="space-y-4">
              <ConsultActions
                patientSummary={patientSummary}
                followUpDate={followUpDate}
                isFollowUpEnabled={isFollowUpEnabled}
                isGeneratingSummary={isGeneratingSummary}
                onSummaryChange={setPatientSummary}
                onFollowUpChange={setFollowUpDate}
                onFollowUpToggle={setIsFollowUpEnabled}
                onGenerateSummary={handleGenerateSummary}
                onFinalize={handleFinalize}
                canFinalize={canFinalize}
              />

              <div className="pt-2">
                <Button variant="ghost" onClick={() => goToStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Notes
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
