import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Search, X } from "lucide-react";
import { useDoctorHistory } from "@/hooks/useDoctorHistory";
import { Input } from "@/components/ui/input";
import type { IcdCode } from "@vox/shared-types";

export default function DoctorHistory() {
  const { consults, loading, error } = useDoctorHistory();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Group consults by patient
  const patientMap = new Map<
    string,
    { id: string; name: string; lastDate: string; totalConsults: number; icdCodes: IcdCode[]; lastFinalized: boolean }
  >();

  for (const c of consults) {
    const existing = patientMap.get(c.patient.id);
    const icdCodes = (c.icdCodes as IcdCode[] | null) || [];

    if (!existing) {
      patientMap.set(c.patient.id, {
        id: c.patient.id,
        name: c.patient.name,
        lastDate: c.createdAt,
        totalConsults: 1,
        icdCodes,
        lastFinalized: c.finalized,
      });
    } else {
      existing.totalConsults += 1;
      if (new Date(c.createdAt) > new Date(existing.lastDate)) {
        existing.lastDate = c.createdAt;
        existing.icdCodes = icdCodes;
        existing.lastFinalized = c.finalized;
      }
    }
  }

  const allPatients = Array.from(patientMap.values()).sort(
    (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime(),
  );

  const query = search.trim().toLowerCase();
  const patients = query
    ? allPatients.filter((p) => p.name.toLowerCase().includes(query))
    : allPatients;

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading records...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Patient Records</h1>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {patients.length === 0 ? (
        <p className="text-muted-foreground">
          {query ? `No patients matching "${search}".` : "No patient records yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Last Visit</th>
                <th className="px-4 py-3 font-medium">Consultations</th>
                <th className="px-4 py-3 font-medium">Recent ICD Codes</th>
                <th className="px-4 py-3 font-medium">Last Status</th>
                <th className="w-8 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/50"
                  onClick={() => navigate(`/doctor/patient/${p.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.lastDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.totalConsults}
                  </td>
                  <td className="px-4 py-3">
                    {p.icdCodes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.icdCodes.slice(0, 3).map((icd) => (
                          <span
                            key={icd.code}
                            className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs"
                            title={icd.description}
                          >
                            {icd.code}
                          </span>
                        ))}
                        {p.icdCodes.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{p.icdCodes.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.lastFinalized
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {p.lastFinalized ? "Finalized" : "In Progress"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <ChevronRight className="h-4 w-4" />
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
