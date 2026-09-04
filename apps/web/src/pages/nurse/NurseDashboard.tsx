import { useNavigate } from "react-router-dom";
import { UserPlus, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { NurseStatsCards } from "@/components/nurse/NurseStatsCards";
import { PatientQueueTable } from "@/components/nurse/PatientQueueTable";
import { usePatients } from "@/hooks/usePatients";
import { useCreatePatient } from "@/hooks/useCreatePatient";
import { useStats } from "@/hooks/useStats";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

export default function NurseDashboard() {
  const navigate = useNavigate();
  const { patients, isLoading, refetch } = usePatients();
  const { stats, isLoading: statsLoading } = useStats("nurse");
  const { createPatient, isSubmitting: isCreatingEmergency } = useCreatePatient();

  const handleQuickEmergency = async () => {
    try {
      await createPatient({
        name: `Emergency Patient (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        gender: "Other", // Required fields with placeholders
        status: "EMERGENCY",
        vitals: { symptoms: ["Emergency admission"], notes: "Created via Quick Add" }
      });
      refetch(); // Refresh the queue
    } catch (err) {
      console.error("Failed to quick-add emergency", err);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Nurse Dashboard"
        subtitle="Manage patient queue and triage"
        actionLabel="Add Patient"
        actionIcon={UserPlus}
        onAction={() => navigate("/nurse/add-patient")}
      >
        <Button
          variant="destructive"
          size="sm"
          onClick={handleQuickEmergency}
          disabled={isCreatingEmergency}
          className="cursor-pointer shadow-sm"
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          {isCreatingEmergency ? "Adding..." : "Quick Emergency"}
        </Button>
      </PageHeader>

      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger-children">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <NurseStatsCards stats={stats} />
      )}

      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Patient Queue
          </h2>
          {!isLoading && patients.length > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
              {patients.length}
            </span>
          )}
        </div>
        {isLoading ? (
          <SkeletonTable rows={4} />
        ) : (
          <PatientQueueTable patients={patients} />
        )}
      </div>
    </div>
  );
}
