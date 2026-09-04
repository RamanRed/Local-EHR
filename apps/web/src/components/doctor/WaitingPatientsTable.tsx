import { useNavigate } from "react-router-dom";
import type { Patient } from "@vox/shared-types";
import { getAge } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PatientVitalsSummary } from "./PatientVitalsSummary";
import { Stethoscope, Users } from "lucide-react";

interface WaitingPatientsTableProps {
  patients: Patient[];
}

export function WaitingPatientsTable({ patients }: WaitingPatientsTableProps) {
  const navigate = useNavigate();

  if (patients.length === 0) {
    return (
      <Card className="p-4">
        <EmptyState
          icon={Users}
          title="No patients waiting"
          description="Patients will appear here when triaged by a nurse."
        />
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Symptoms</TableHead>
            <TableHead>Vitals</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id} className="group transition-colors hover:bg-muted/40">
              <TableCell className="font-semibold">{patient.name}</TableCell>
              <TableCell>{getAge(patient.dob)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    let symptomList: string[] = [];
                    try {
                      if (typeof patient.vitals?.symptoms === 'string') {
                        symptomList = JSON.parse(patient.vitals?.symptoms);
                      } else if (Array.isArray(patient.vitals?.symptoms)) {
                        symptomList = patient.vitals.symptoms;
                      }
                    } catch (e) {
                      symptomList = [];
                    }
                    return (
                      <>
                        {symptomList.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary"
                          >
                            {s}
                          </span>
                        ))}
                        {symptomList.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{symptomList.length - 2} more
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </TableCell>
              <TableCell>
                <PatientVitalsSummary vitals={patient.vitals} />
              </TableCell>
              <TableCell>
                <StatusBadge status={patient.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  onClick={() => navigate(`/doctor/consult/${patient.id}`)}
                  className="cursor-pointer shadow-sm transition-all duration-200 group-hover:shadow-md"
                >
                  <Stethoscope className="mr-1.5 h-3.5 w-3.5" />
                  Start Consult
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
