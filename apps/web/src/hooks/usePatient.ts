import { useState, useEffect } from "react";
import type { Patient } from "@vox/shared-types";
import { patientApi } from "@/services/api";

export function usePatient(id?: string) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    patientApi
      .getById(id)
      .then(setPatient)
      .catch((err: any) => {
        setError(err.response?.data?.message || "Failed to load patient");
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  return { patient, isLoading, error };
}
