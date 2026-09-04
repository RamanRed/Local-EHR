import { Users, Clock, AlertTriangle, CheckCircle, Activity, Calendar, CalendarClock } from "lucide-react";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatsGrid } from "@/components/shared/StatsGrid";
import type { NurseStats } from "@/hooks/useStats";

interface NurseStatsCardsProps {
  stats: NurseStats | null;
}

export function NurseStatsCards({ stats }: NurseStatsCardsProps) {
  return (
    <StatsGrid>
      <StatsCard
        label="Total Patients"
        value={stats?.totalPatients ?? 0}
        icon={Users}
        iconColor="text-primary"
      />
      <StatsCard
        label="Waiting"
        value={stats?.waiting ?? 0}
        icon={Clock}
        iconColor="text-amber-600"
      />
      <StatsCard
        label="Emergency"
        value={stats?.emergency ?? 0}
        icon={AlertTriangle}
        iconColor="text-red-600"
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
