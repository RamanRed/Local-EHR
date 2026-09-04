import { useState, useEffect } from "react";
import type { Patient } from "@vox/shared-types";
import { patientApi } from "@/services/api";
import { useAuthStore } from "@/store";

export function useNurseHistory() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    patientApi
      .list()
      .then((all) => setPatients(all.filter((p) => p.createdBy === userId)))
      .catch((e) => setError(e.response?.data?.message || "Failed to load history"))
      .finally(() => setLoading(false));
  }, [userId]);

  return { patients, loading, error };
}
