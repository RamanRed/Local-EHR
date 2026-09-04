import { useState } from "react";
import type { IcdCode } from "@vox/shared-types";
import { aiApi } from "@/services/api";

interface AiResult {
  cleanedSymptoms: string[];
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  icdSuggestions: IcdCode[];
}

export function useAiAnalyze() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze(data: {
    transcript?: string;
    symptoms?: string[];
    vitals?: Record<string, unknown>;
    previousSummary?: string;
  }): Promise<AiResult> {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await aiApi.analyze(data);
      return result as AiResult;
    } catch (err: any) {
      const msg = err.response?.data?.message || "AI analysis failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return { analyze, isAnalyzing, error };
}
