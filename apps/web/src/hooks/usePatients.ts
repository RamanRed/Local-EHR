import { useState, useEffect, useCallback } from "react";
import type { Patient } from "@vox/shared-types";
import { patientApi } from "@/services/api";

export function usePatients(status?: string) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await patientApi.list(status);
      setPatients(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { patients, isLoading, error, refetch: fetch };
}
