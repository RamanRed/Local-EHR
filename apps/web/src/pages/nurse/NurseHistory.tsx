import { useState } from "react";
import { useNurseHistory } from "@/hooks/useNurseHistory";
import { getAge, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PatientStatus } from "@vox/shared-types";

const statusColors: Record<string, string> = {
  WAITING: "bg-amber-100 text-amber-700",
  IN_CONSULT: "bg-blue-100 text-blue-700",
  UNDER_TREATMENT: "bg-indigo-100 text-indigo-700",
  CURED: "bg-green-100 text-green-700",
  EMERGENCY: "bg-red-100 text-red-700",
};

export default function NurseHistory() {
  const { patients, loading, error } = useNurseHistory();
  const [statusFilter, setStatusFilter] = useState<PatientStatus | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState("");

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading patient records...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  const filteredPatients = patients.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (dateFilter) {
      const pDate = new Date(p.createdAt).toISOString().split("T")[0];
      if (pDate !== dateFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Patient Records</h1>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {["ALL", "WAITING", "IN_CONSULT", "UNDER_TREATMENT", "CURED"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status as any)}
              className={cn("rounded-full", statusFilter === status ? "" : "text-muted-foreground")}
            >
              {status === "ALL" ? "All" : status.replace("_", " ")}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Date:</span>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-[160px] h-9"
          />
          {dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDateFilter("")} className="h-9 px-2 text-muted-foreground">
              Clear
            </Button>
          )}
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <p className="text-muted-foreground">No patient records found matching the filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Patient Name</th>
                <th className="px-4 py-3 font-medium">Age</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{getAge(p.dob)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[p.status] || "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
