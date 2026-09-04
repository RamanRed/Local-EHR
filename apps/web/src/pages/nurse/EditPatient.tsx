import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { PatientInfoForm } from "@/components/nurse/PatientInfoForm";
import { VitalsForm } from "@/components/nurse/VitalsForm";
import { SymptomsInput } from "@/components/nurse/SymptomsInput";
import { patientApi } from "@/services/api";

export default function EditPatient() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [patientInfo, setPatientInfo] = useState({
        name: "",
        dob: "",
        gender: "",
        phone: "",
        aadhaarNumber: "",
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

    useEffect(() => {
        async function loadPatient() {
            if (!id) return;
            try {
                const patient = await patientApi.getById(id);
                setPatientInfo({
                    name: patient.name,
                    dob: patient.dob ? patient.dob.slice(0, 10) : "",
                    gender: patient.gender || "",
                    phone: patient.phone || "",
                    aadhaarNumber: patient.aadhaarNumber || "",
                    bloodGroup: patient.bloodGroup || "",
                    emergencyContact: patient.emergencyContact || "",
                });

                if (patient.vitals) {
                    setVitals({
                        bloodPressure: patient.vitals.bloodPressure || "",
                        heartRate: patient.vitals.heartRate?.toString() || "",
                        temperature: patient.vitals.temperature?.toString() || "",
                        oxygenSat: patient.vitals.oxygenSat?.toString() || "",
                        bloodGlucose: patient.vitals.bloodGlucose?.toString() || "",
                        weight: patient.vitals.weight?.toString() || "",
                        height: patient.vitals.height?.toString() || "",
                    });
                    setSymptoms(patient.vitals.symptoms || []);
                    setNotes(patient.vitals.notes || "");
                }
            } catch (err: any) {
                setError(err.response?.data?.message || "Failed to load patient");
            } finally {
                setIsLoading(false);
            }
        }
        loadPatient();
    }, [id]);

    function handlePatientChange(field: string, value: string) {
        setPatientInfo((prev) => ({ ...prev, [field]: value }));
    }

    function handleVitalsChange(field: string, value: string) {
        setVitals((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!id) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await patientApi.update(id, {
                name: patientInfo.name,
                dob: patientInfo.dob || undefined,
                gender: patientInfo.gender,
                phone: patientInfo.phone,
                aadhaarNumber: patientInfo.aadhaarNumber,
                bloodGroup: patientInfo.bloodGroup,
                emergencyContact: patientInfo.emergencyContact,
                vitals: { ...vitals, symptoms, notes },
            });
            navigate("/nurse");
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to save changes");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Loading patient details...
            </div>
        );
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
                    title="Edit Patient"
                    subtitle="Update patient demographics and vitals"
                />
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

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
                        <CardTitle className="text-base">Symptoms & Notes</CardTitle>
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
                    <CardContent className="flex items-center justify-end pt-6 gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate("/nurse")}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
