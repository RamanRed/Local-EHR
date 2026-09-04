import { PageHeader } from "@/components/shared/PageHeader";
import { PatientStatsCards } from "@/components/patient/PatientStatsCards";
import { ConsultSummaryCard } from "@/components/patient/ConsultSummaryCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useStats } from "@/hooks/useStats";
import { usePatientHistory } from "@/hooks/usePatientHistory";
import { useAuthStore } from "@/store";
import { FileText } from "lucide-react";
import { SkeletonCard } from "@/components/ui/skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientPortal() {
  const { stats, isLoading: statsLoading } = useStats("patient");
  const { consults, loading: isLoading } = usePatientHistory();
  const user = useAuthStore((s) => s.user);

  const finalizedConsults = consults;

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <p className="text-sm text-muted-foreground mb-0.5">{greeting},</p>
        <PageHeader
          title={user?.name || "Patient Portal"}
          subtitle="View your consultation summaries and follow-ups"
        />
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger-children">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <PatientStatsCards stats={stats} />
      )}

      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
          Consultation History
        </h2>
        {isLoading ? (
          <div className="space-y-4 stagger-children">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : finalizedConsults.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No consultations yet"
            description="Your consultation summaries will appear here after your doctor finalizes them."
          />
        ) : (
          <div className="space-y-4 stagger-children">
            {finalizedConsults.map((consult) => (
              <ConsultSummaryCard key={consult.id} consult={consult} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
