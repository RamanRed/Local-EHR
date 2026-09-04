import { useState } from "react";
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
import { PatientDetailDialog } from "./PatientDetailDialog";
import { Eye, Users } from "lucide-react";

interface PatientQueueTableProps {
  patients: Patient[];
  onPatientUpdated?: (patient: Patient) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PatientQueueTable({ patients, onPatientUpdated }: PatientQueueTableProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  if (patients.length === 0) {
    return (
      <Card className="p-4">
        <EmptyState
          icon={Users}
          title="No patients yet"
          description="Patients will appear here once added."
        />
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id} className="group transition-colors hover:bg-muted/40">
                <TableCell className="font-semibold">{patient.name}</TableCell>
                <TableCell>{getAge(patient.dob)}</TableCell>
                <TableCell>{patient.gender}</TableCell>
                <TableCell>
                  <StatusBadge status={patient.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTime(patient.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPatient(patient)}
                    className="cursor-pointer transition-all duration-200 group-hover:bg-primary/5 group-hover:text-primary"
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <PatientDetailDialog
        patient={selectedPatient}
        open={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        onPatientUpdated={(updated) => {
          setSelectedPatient(updated);
          onPatientUpdated?.(updated);
        }}
      />
    </>
  );
}
