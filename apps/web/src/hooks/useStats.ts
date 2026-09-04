import { useState, useEffect } from "react";
import { statsApi } from "@/services/api";

export interface NurseStats {
  totalPatients: number;
  waiting: number;
  emergency: number;
  completedToday: number;
  underTreatment: number;
  todayFollowUps: number;
  upcomingFollowUps: number;
}

export interface DoctorStats {
  waiting: number;
  inConsult: number;
  completedToday: number;
  underTreatment: number;
  todayFollowUps: number;
  upcomingFollowUps: number;
}

export interface PatientStats {
  totalVisits: number;
  upcomingFollowUps: number;
}

type RoleStatsMap = {
  nurse: NurseStats;
  doctor: DoctorStats;
  patient: PatientStats;
};

export function useStats<R extends keyof RoleStatsMap>(role: R) {
  const [stats, setStats] = useState<RoleStatsMap[R] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const fetcher = statsApi[role];
    fetcher()
      .then((data) => setStats(data as RoleStatsMap[R]))
      .catch((err: any) => {
        setError(err.response?.data?.message || "Failed to load stats");
      })
      .finally(() => setIsLoading(false));
  }, [role]);

  return { stats, isLoading, error };
}
