import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/form-field";
import { PatientInfoForm } from "@/components/nurse/PatientInfoForm";
import { VitalsForm } from "@/components/nurse/VitalsForm";
import { SymptomsInput } from "@/components/nurse/SymptomsInput";
import { useCreatePatient } from "@/hooks/useCreatePatient";
import { patientApi } from "@/services/api";

type LookupStatus = "idle" | "searching" | "found-patient" | "found-user" | "not-found";

export default function AddPatient() {
  const navigate = useNavigate();
  const { createPatient, isSubmitting, error } = useCreatePatient();

  // Aadhaar lookup
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const [lookupError, setLookupError] = useState("");
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);

  const [patientInfo, setPatientInfo] = useState({
    name: "",
    dob: "",
    gender: "",
    phone: "",
    bloodGroup: "",
    emergencyContact: "",
  });

  const [vitals, setVitals] = useState({
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    oxygenSat: "",
    bloodGlucose: "",
    weight: "",
    height: "",
  });

  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  // Demographics are pre-filled but always editable by nurse

  function handlePatientChange(field: string, value: string) {
    setPatientInfo((prev) => ({ ...prev, [field]: value }));
  }

  function handleVitalsChange(field: string, value: string) {
    setVitals((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAadhaarSearch() {
    const cleaned = aadhaarInput.replace(/\D/g, "");
    if (!/^\d{12}$/.test(cleaned)) {
      setLookupError("Enter a valid 12-digit Aadhaar number");
      return;
    }

    setLookupError("");
    setLookupStatus("searching");

    try {
      const result = await patientApi.searchByAadhaar(cleaned);

      if (result.source === "patient") {
        const p = result.patient;
        setPatientInfo({
          name: p.name,
          dob: p.dob ? p.dob.slice(0, 10) : "",
          gender: p.gender || "",
          phone: p.phone || "",
          bloodGroup: p.bloodGroup || "",
          emergencyContact: p.emergencyContact || "",
        });

        // Pre-fill vitals from last visit as reference
        if (p.vitals) {
          setVitals({
            bloodPressure: p.vitals.bloodPressure || "",
            heartRate: p.vitals.heartRate?.toString() || "",
            temperature: p.vitals.temperature?.toString() || "",
            oxygenSat: p.vitals.oxygenSat?.toString() || "",
            bloodGlucose: p.vitals.bloodGlucose?.toString() || "",
            weight: p.vitals.weight?.toString() || "",
            height: p.vitals.height?.toString() || "",
          });
          setSymptoms(p.vitals.symptoms || []);
          setNotes(p.vitals.notes || "");
        }

        setExistingPatientId(p.id);
        setLookupStatus("found-patient");
      } else if (result.source === "user") {
        const u = result.user;
        setPatientInfo({
          name: u.name,
          dob: u.dob ? u.dob.slice(0, 10) : "",
          gender: u.gender || "",
          phone: "",
          bloodGroup: u.bloodGroup || "",
          emergencyContact: u.emergencyContact || "",
        });
        setLookupStatus("found-user");
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setLookupStatus("not-found");
      } else {
        setLookupError(err.response?.data?.message || "Search failed");
        setLookupStatus("idle");
      }
    }
  }

  function handleClearLookup() {
    setAadhaarInput("");
    setLookupStatus("idle");
    setLookupError("");
    setExistingPatientId(null);
    setPatientInfo({ name: "", dob: "", gender: "", phone: "", bloodGroup: "", emergencyContact: "" });
    setVitals({ bloodPressure: "", heartRate: "", temperature: "", oxygenSat: "", bloodGlucose: "", weight: "", height: "" });
    setSymptoms([]);
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (existingPatientId) {
        // Returning patient -update vitals and re-queue
        await patientApi.revisit(existingPatientId, {
          name: patientInfo.name,
          gender: patientInfo.gender,
          phone: patientInfo.phone || undefined,
          dob: patientInfo.dob || undefined,
          bloodGroup: patientInfo.bloodGroup || undefined,
          emergencyContact: patientInfo.emergencyContact || undefined,
          status: isEmergency ? "EMERGENCY" : "WAITING",
          vitals: { ...vitals, symptoms, notes },
        });
      } else {
        // New patient
        const aadhaarNumber = aadhaarInput.replace(/\D/g, "");
        await createPatient({
          name: patientInfo.name,
          gender: patientInfo.gender,
          phone: patientInfo.phone || undefined,
          dob: patientInfo.dob || undefined,
          aadhaarNumber: aadhaarNumber.length === 12 ? aadhaarNumber : undefined,
          bloodGroup: patientInfo.bloodGroup || undefined,
          emergencyContact: patientInfo.emergencyContact || undefined,
          status: isEmergency ? "EMERGENCY" : "WAITING",
          vitals: { ...vitals, symptoms, notes },
        });
      }
      navigate("/nurse");
    } catch {
      // error is set by the hook
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/nurse")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Add Patient"
          subtitle="Search by Aadhaar to check for returning patients"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Aadhaar Lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aadhaar Lookup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <FormField label="Aadhaar Number" htmlFor="aadhaarLookup" className="flex-1">
              <Input
                id="aadhaarLookup"
                placeholder="Enter 12-digit Aadhaar number"
                maxLength={12}
                inputMode="numeric"
                value={aadhaarInput}
                onChange={(e) => {
                  setAadhaarInput(e.target.value.replace(/\D/g, ""));
                  if (lookupStatus !== "idle" && lookupStatus !== "searching") {
                    // Reset on new input
                    setLookupStatus("idle");
                  }
                }}
                disabled={lookupStatus === "searching"}
              />
            </FormField>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                onClick={handleAadhaarSearch}
                disabled={lookupStatus === "searching" || aadhaarInput.length !== 12}
              >
                {lookupStatus === "searching" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Search
              </Button>
              {lookupStatus !== "idle" && lookupStatus !== "searching" && (
                <Button type="button" variant="outline" onClick={handleClearLookup}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {lookupError && (
            <p className="text-sm text-red-600">{lookupError}</p>
          )}

          {lookupStatus === "found-patient" && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Returning patient -previous details loaded. You can edit any field before submitting.
            </div>
          )}

          {lookupStatus === "found-user" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Patient found from registration. Demographics loaded -you can edit any field before submitting.
            </div>
          )}

          {lookupStatus === "not-found" && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              New patient -no previous records found. Fill in all details below.
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <PatientInfoForm
              values={patientInfo}
              onChange={handlePatientChange}
            />
          </CardContent>
        </Card>

        {/* Vitals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vitals</CardTitle>
          </CardHeader>
          <CardContent>
            <VitalsForm values={vitals} onChange={handleVitalsChange} />
          </CardContent>
        </Card>

        {/* Symptoms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Symptoms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SymptomsInput symptoms={symptoms} onChange={setSymptoms} />
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="font-medium text-red-600">
                Mark as Emergency
              </span>
            </label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/nurse")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? existingPatientId ? "Updating..." : "Adding..."
                  : existingPatientId ? "Re-queue Patient" : "Add Patient"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
