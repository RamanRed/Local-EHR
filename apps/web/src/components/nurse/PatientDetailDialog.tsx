import type { Patient } from "@vox/shared-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PatientInfoCard } from "@/components/shared/PatientInfoCard";
import { VitalsDisplay } from "@/components/shared/VitalsDisplay";
import { SymptomsDisplay } from "@/components/shared/SymptomsDisplay";
import { Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PatientDetailDialogProps {
  patient: Patient | null;
  open: boolean;
  onClose: () => void;
  onPatientUpdated?: (patient: Patient) => void;
}

export function PatientDetailDialog({
  patient,
  open,
  onClose,
}: PatientDetailDialogProps) {
  const navigate = useNavigate();

  if (!patient) return null;

  function handleEditClick() {
    onClose(); // Close the modal
    navigate(`/nurse/edit-patient/${patient!.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Patient Details</DialogTitle>
              <DialogDescription>
                Full details for {patient.name}
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleEditClick}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <PatientInfoCard patient={patient} />
          {patient.vitals && <VitalsDisplay vitals={patient.vitals} />}
          {patient.vitals && patient.vitals.symptoms.length > 0 && (
            <SymptomsDisplay symptoms={patient.vitals.symptoms} />
          )}
          {patient.vitals?.notes && (
            <div>
              <p className="text-sm font-medium text-foreground">Notes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {patient.vitals.notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
