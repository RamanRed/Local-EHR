import { Clock, Stethoscope, CheckCircle, Activity, Calendar, CalendarClock } from "lucide-react";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatsGrid } from "@/components/shared/StatsGrid";
import type { DoctorStats } from "@/hooks/useStats";

interface DoctorStatsCardsProps {
  stats: DoctorStats | null;
}

export function DoctorStatsCards({ stats }: DoctorStatsCardsProps) {
  return (
    <StatsGrid>
      <StatsCard
        label="Waiting"
        value={stats?.waiting ?? 0}
        icon={Clock}
        iconColor="text-amber-600"
      />
      <StatsCard
        label="In Consult"
        value={stats?.inConsult ?? 0}
        icon={Stethoscope}
        iconColor="text-blue-600"
      />
      <StatsCard
        label="Completed Today"
        value={stats?.completedToday ?? 0}
        icon={CheckCircle}
        iconColor="text-green-600"
      />
      <StatsCard
        label="Under Treatment"
        value={stats?.underTreatment ?? 0}
        icon={Activity}
        iconColor="text-indigo-600"
      />
      <StatsCard
        label="Today's Follow-Ups"
        value={stats?.todayFollowUps ?? 0}
        icon={Calendar}
        iconColor="text-fuchsia-600"
      />
      <StatsCard
        label="Upcoming Follow-Ups"
        value={stats?.upcomingFollowUps ?? 0}
        icon={CalendarClock}
        iconColor="text-violet-600"
      />
    </StatsGrid>
  );
}
