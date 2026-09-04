import { useState, useEffect } from "react";
import type { Consult } from "@vox/shared-types";
import { consultApi } from "@/services/api";
import { useAuthStore } from "@/store";

export function usePatientHistory() {
  const [consults, setConsults] = useState<Consult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!userId) return;
    consultApi
      .getByPatient(userId)
      .then((all) => setConsults(all.filter((c) => c.finalized)))
      .catch((e) => setError(e.response?.data?.message || "Failed to load history"))
      .finally(() => setLoading(false));
  }, [userId]);

  return { consults, loading, error };
}
