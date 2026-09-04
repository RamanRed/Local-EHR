import { useState } from "react";
import { aiApi } from "@/services/api";

export interface SuggestResult {
  session_id: string;
  response: string;
  confidence_score: number;
  confidence_label: "HIGH" | "MEDIUM" | "LOW";
  citations: string[];
  uncertainty_note: string | null;
  data_source: string;
  all_diseases: DiseaseEntry[];
  awaiting_confirmation: boolean;
}

export interface DiseaseEntry {
  disease_name: string;
  icd_10_code: string;
  description: string;
  specialty: string;
  source: string;
  rationale: string;
  rank?: number;
  composite_score?: number;
  symptoms: { name: string; severity: string; frequency: string }[];
  treatments: { name: string; type: string; first_line: boolean }[];
  medications: {
    generic_name: string;
    drug_class: string;
    dose: string;
    route: string;
  }[];
}

export interface ConfirmResult {
  success: boolean;
  fhir_bundle?: unknown;
  [key: string]: unknown;
}

export function useSuggestPipeline() {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [suggestResult, setSuggestResult] = useState<SuggestResult | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  async function suggestDiseases(symptoms: string): Promise<SuggestResult> {
    setIsSuggesting(true);
    setSuggestError(null);
    try {
      const result = await aiApi.suggest(symptoms);
      setSuggestResult(result as SuggestResult);
      return result as SuggestResult;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Disease suggestion failed";
      setSuggestError(msg);
      throw new Error(msg);
    } finally {
      setIsSuggesting(false);
    }
  }

  async function confirmDiseases(
    sessionId: string,
    selectedIcdCodes: string[],
    patientInfo?: Record<string, unknown>,
    vitals?: Record<string, unknown>,
  ): Promise<ConfirmResult> {
    setIsConfirming(true);
    setSuggestError(null);
    try {
      const result = await aiApi.suggestConfirm({
        session_id: sessionId,
        selected_icd_codes: selectedIcdCodes,
        patient_info: patientInfo,
        vitals,
      });
      return result as ConfirmResult;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Confirmation failed";
      setSuggestError(msg);
      throw new Error(msg);
    } finally {
      setIsConfirming(false);
    }
  }

  return {
    suggestDiseases,
    confirmDiseases,
    isSuggesting,
    isConfirming,
    suggestResult,
    suggestError,
  };
}
