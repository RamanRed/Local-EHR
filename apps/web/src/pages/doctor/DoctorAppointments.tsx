import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Check, X, Clock, Calendar } from "lucide-react";
import type { Appointment, AppointmentStatus } from "@vox/shared-types";
import { appointmentApi } from "@/services/api";
import { useAuthStore } from "@/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<AppointmentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const typeLabels: Record<string, string> = {
  videoConsultation: "Video Call",
  followUpCall: "Follow-up Call",
  inClinic: "In-Clinic",
};

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | AppointmentStatus>("all");

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      setIsLoading(true);
      const data = await appointmentApi.list();
      setAppointments(data);
    } catch (err) {
      console.error("Failed to load appointments:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm(id: string) {
    try {
      await appointmentApi.update(id, {
        status: "confirmed",
        doctorId: user?.id,
        doctorName: user?.name,
      });
      loadAppointments();
    } catch (err) {
      console.error("Failed to confirm appointment:", err);
    }
  }

  async function handleCancel(id: string) {
    try {
      await appointmentApi.updateStatus(id, "cancelled");
      loadAppointments();
    } catch (err) {
      console.error("Failed to cancel appointment:", err);
    }
  }

  const filtered =
    filter === "all"
      ? appointments
      : appointments.filter((a) => a.status === filter);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments.filter(
    (a) => a.preferredDate.split("T")[0] === todayStr && a.status !== "cancelled"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle={`${todayAppointments.length} appointment${todayAppointments.length !== 1 ? "s" : ""} today`}
      />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading appointments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-muted-foreground">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => (
            <div
              key={appt.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  {appt.type === "videoConsultation" ? (
                    <Video className="h-5 w-5 text-primary" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {appt.patient?.name || "Unknown Patient"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{typeLabels[appt.type] || appt.type}</span>
                    <span>·</span>
                    <span>
                      {new Date(appt.preferredDate).toLocaleDateString()}
                    </span>
                    <span>·</span>
                    <span>{appt.timeSlot}</span>
                    {appt.reason && (
                      <>
                        <span>·</span>
                        <span>{appt.reason}</span>
                      </>
                    )}
                  </div>
                  {appt.symptoms && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Symptoms: {appt.symptoms}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={statusColors[appt.status]}>
                  {appt.status}
                </Badge>

                {appt.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfirm(appt.id)}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleCancel(appt.id)}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </>
                )}

                {appt.type === "videoConsultation" &&
                  (appt.status === "confirmed" || appt.status === "pending") &&
                  appt.roomId && (
                    <Button
                      size="sm"
                      onClick={() =>
                        navigate(`/doctor/video-call/${appt.id}`)
                      }
                    >
                      <Video className="mr-1 h-3.5 w-3.5" />
                      Join Call
                    </Button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
