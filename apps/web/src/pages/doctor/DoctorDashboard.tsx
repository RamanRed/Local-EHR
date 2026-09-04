import { PageHeader } from "@/components/shared/PageHeader";
import { DoctorStatsCards } from "@/components/doctor/DoctorStatsCards";
import { WaitingPatientsTable } from "@/components/doctor/WaitingPatientsTable";
import { usePatients } from "@/hooks/usePatients";
import { useStats } from "@/hooks/useStats";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

export default function DoctorDashboard() {
  const { patients, isLoading } = usePatients("WAITING");
  const { stats, isLoading: statsLoading } = useStats("doctor");

  // Also get emergency patients
  const { patients: emergencyPatients } = usePatients("EMERGENCY");
  const allWaiting = [...patients, ...emergencyPatients];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Doctor Dashboard"
        subtitle="View waiting patients and start consultations"
      />

      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger-children">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <DoctorStatsCards stats={stats} />
      )}

      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Waiting Patients
          </h2>
          {!isLoading && allWaiting.length > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
              {allWaiting.length}
            </span>
          )}
        </div>
        {isLoading ? (
          <SkeletonTable rows={4} />
        ) : (
          <WaitingPatientsTable patients={allWaiting} />
        )}
      </div>
    </div>
  );
}
