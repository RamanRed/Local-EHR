import { useState } from "react";
import type { Consult, IcdCode } from "@vox/shared-types";
import { consultApi } from "@/services/api";

export function useConsult() {
  const [consult, setConsult] = useState<Consult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createConsult(patientId: string, transcript?: string) {
    setIsLoading(true);
    setError(null);
    try {
      const data = await consultApi.create({ patientId, transcript });
      setConsult(data);
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to create consult";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateConsult(
    id: string,
    data: {
      transcript?: string;
      soapSubjective?: string;
      soapObjective?: string;
      soapAssessment?: string;
      soapPlan?: string;
      icdCodes?: IcdCode[];
      patientSummary?: string;
      followUpDate?: string | null;
      finalized?: boolean;
    }
  ) {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await consultApi.update(id, data);
      setConsult(updated);
      return updated;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to update consult";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return { consult, isLoading, error, createConsult, updateConsult };
}
