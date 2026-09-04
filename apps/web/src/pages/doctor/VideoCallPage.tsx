import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, CheckCircle2, PhoneOff, Calendar } from "lucide-react";
import type { Appointment } from "@vox/shared-types";
import { appointmentApi } from "@/services/api";
import { useAuthStore } from "@/store";
import { VideoRoom } from "@/components/doctor/VideoRoom";
import { Button } from "@/components/ui/button";

export default function VideoCallPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callEnded, setCallEnded] = useState(false);
  const [duration, setDuration] = useState("");
  const callStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!id) return;

    appointmentApi
      .getById(id)
      .then((data) => {
        if (!data.roomId) {
          setError("This appointment does not have a video room.");
          return;
        }
        setAppointment(data);
      })
      .catch(() => setError("Failed to load appointment."))
      .finally(() => setIsLoading(false));
  }, [id]);

  function handleLeave() {
    const elapsed = Math.floor((Date.now() - callStartRef.current) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    setDuration(
      mins > 0
        ? `${mins} min${mins !== 1 ? "s" : ""} ${secs} sec${secs !== 1 ? "s" : ""}`
        : `${secs} second${secs !== 1 ? "s" : ""}`
    );
    setCallEnded(true);

    // Mark appointment as completed
    if (id) {
      appointmentApi.updateStatus(id, "completed").catch(() => {});
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="space-y-4 p-8">
        <p className="text-red-600">{error || "Appointment not found."}</p>
        <Button variant="outline" onClick={() => navigate("/doctor/appointments")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Appointments
        </Button>
      </div>
    );
  }

  // ── Call ended screen ──
  if (callEnded) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Consultation Completed
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Video consultation with{" "}
            <span className="font-medium text-gray-700">
              {appointment.patient?.name || "Patient"}
            </span>{" "}
            has ended.
          </p>

          {duration && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
              <PhoneOff className="h-3 w-3" />
              Duration: {duration}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() => navigate("/doctor/appointments")}
              className="w-full"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Back to Appointments
            </Button>
            {appointment.patient && (
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/doctor/consult/${appointment.patient!.id}`)
                }
                className="w-full"
              >
                <User className="mr-2 h-4 w-4" />
                Start Consult Notes
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── In-call ──
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleLeave}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              <User className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {appointment.patient?.name || "Patient"}
              </p>
              <p className="text-xs text-muted-foreground">
                Video Consultation · {appointment.timeSlot}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Video container */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <VideoRoom
          roomId={appointment.roomId!}
          userName={user?.name || "Doctor"}
          onLeave={handleLeave}
        />
      </div>
    </div>
  );
}
