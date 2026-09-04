import { useState, useEffect } from "react";
import type { ConsultWithPatient } from "@vox/shared-types";
import { consultApi } from "@/services/api";

export function useDoctorHistory() {
  const [consults, setConsults] = useState<ConsultWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    consultApi
      .listByDoctor()
      .then(setConsults)
      .catch((e) => setError(e.response?.data?.message || "Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  return { consults, loading, error };
}
