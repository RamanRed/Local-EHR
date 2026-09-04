import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Video, CheckCircle2, PhoneOff } from "lucide-react";
import { VideoRoom } from "@/components/doctor/VideoRoom";

type ViewState = "join" | "in-call" | "ended";

export default function PublicVideoRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [userName, setUserName] = useState("");
  const [view, setView] = useState<ViewState>("join");
  const callStartRef = useRef<number>(0);
  const [duration, setDuration] = useState("");

  if (!roomId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-red-600">Invalid video room link.</p>
      </div>
    );
  }

  function handleJoin() {
    if (userName.trim()) {
      callStartRef.current = Date.now();
      setView("in-call");
    }
  }

  function handleLeave() {
    const elapsed = Math.floor((Date.now() - callStartRef.current) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    setDuration(
      mins > 0
        ? `${mins} min${mins !== 1 ? "s" : ""} ${secs} sec${secs !== 1 ? "s" : ""}`
        : `${secs} second${secs !== 1 ? "s" : ""}`
    );
    setView("ended");
  }

  // ── Join screen ──
  if (view === "join") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
              <Video className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Join Video Consultation
              </h1>
              <p className="text-sm text-gray-500">
                Enter your name to join the call
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
          >
            <input
              type="text"
              placeholder="Your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={!userName.trim()}
              className="mt-3 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Join Call
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            SarvaVaidya Video Consultation
          </p>
        </div>
      </div>
    );
  }

  // ── Call ended screen ──
  if (view === "ended") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Consultation Completed
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Your video consultation has ended successfully.
          </p>
          {duration && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
              <PhoneOff className="h-3 w-3" />
              Duration: {duration}
            </div>
          )}
          <div className="mt-6">
            <button
              onClick={() => {
                setUserName("");
                setView("join");
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Rejoin Call
            </button>
          </div>
          <p className="mt-6 text-xs text-gray-400">
            You can safely close this window now.
          </p>
        </div>
      </div>
    );
  }

  // ── In-call ──
  return (
    <div className="h-screen w-screen overflow-hidden">
      <VideoRoom
        roomId={roomId}
        userName={userName}
        onLeave={handleLeave}
      />
    </div>
  );
}
