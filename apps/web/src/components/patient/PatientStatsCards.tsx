import { FileText, CalendarDays } from "lucide-react";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatsGrid } from "@/components/shared/StatsGrid";
import type { PatientStats } from "@/hooks/useStats";

interface PatientStatsCardsProps {
  stats: PatientStats | null;
}

export function PatientStatsCards({ stats }: PatientStatsCardsProps) {
  return (
    <StatsGrid>
      <StatsCard
        label="Total Visits"
        value={stats?.totalVisits ?? 0}
        icon={FileText}
        iconColor="text-primary"
      />
      <StatsCard
        label="Upcoming Follow-ups"
        value={stats?.upcomingFollowUps ?? 0}
        icon={CalendarDays}
        iconColor="text-amber-600"
      />
    </StatsGrid>
  );
}
