import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
    Calendar,
    CheckCircle,
    Clock,
    Stethoscope,
    FileText,
    AlertCircle,
    ChevronLeft,
    Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { FollowUpWithConsults } from "@vox/shared-types";
import { consultApi, followUpApi } from "@/services/api";

type Progress = "IMPROVING" | "SAME" | "WORSE" | null;

export default function FollowUpConsultPage() {
    const { followUpId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    // Mock fetching FollowUp record
    const [followUp, setFollowUp] = useState<FollowUpWithConsults | null>(null);

    const [symptoms, setSymptoms] = useState("");
    const [progress, setProgress] = useState<Progress>(null);
    const [prescription, setPrescription] = useState("");
    const [notes, setNotes] = useState("");
    const [additionalFollowUpDate, setAdditionalFollowUpDate] = useState("");
    const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!followUpId) return;
        followUpApi.getById(followUpId)
            .then((data: any) => {
                setFollowUp(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load follow-up", err);
                setLoading(false);
            });
    }, [followUpId]);

    if (loading) return <div className="p-6">Loading continuation record...</div>;

    const handleFinalize = async () => {
        if (!followUp || !progress || !symptoms) return; // Basic validation
        setSaving(true);
        try {
            // Create the draft Consult that fulfills this follow-up
            const draft = await consultApi.create({
                patientId: followUp.patientId,
                isFollowUp: true,
                fulfilledFollowUpId: followUp.id,
            });

            // Finalize the consult (triggers backend patient status & followUp updates)
            await consultApi.update(draft.id, {
                symptoms,
                progressNote: progress,
                prescription,
                patientSummary: notes,
                followUpDate: scheduleFollowUp ? additionalFollowUpDate : undefined,
                finalized: true
            });

            navigate("/doctor/follow-ups");
        } catch (err) {
            console.error("Finalization failed:", err);
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold flex items-center gap-2">
                            Follow-Up Consultation
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                Continuation
                            </Badge>
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full">
                        <Wand2 className="w-4 h-4" /> AI Assist (Auto-Fill)
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl mx-auto space-y-6">

                    {/* Patient Summary Header */}
                    <Card className="p-6 border-indigo-100 shadow-sm bg-indigo-50/30">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Patient Overview</h2>
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Last Diagnosis</p>
                                        <p className="mt-1 font-medium text-gray-900">Acute Bronchitis</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Previous Prescription</p>
                                        <p className="mt-1 font-medium text-gray-900 line-clamp-2">Amoxicillin 500mg, Rest</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Last Consult Date</p>
                                        <p className="mt-1 font-medium text-gray-900">Feb 14, 2026</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                                        <p className="mt-1 font-medium text-indigo-600">Under Treatment</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column: Follow Up History Chain */}
                        <div className="lg:col-span-1 space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                                Follow-Up History
                            </h3>

                            <div className="relative border-l-2 border-gray-100 ml-3 space-y-6 pb-4">

                                {/* Mock History Block */}
                                <div className="relative pl-6">
                                    <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                                    <div className="bg-white border rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 rounded-md">Follow-Up 1</Badge>
                                            <span className="text-xs text-muted-foreground">Feb 14, 2026</span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">Progress: <span className="text-emerald-600">Improving</span></p>
                                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                                            Patient reports cough has subsided significantly. Still experiencing mild fatigue. Continued rest advised.
                                        </p>
                                    </div>
                                </div>

                                {/* Root Consult Block */}
                                <div className="relative pl-6">
                                    <div className="absolute w-3 h-3 bg-gray-300 rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className="text-gray-500 rounded-md">Initial Consult</Badge>
                                            <span className="text-xs text-muted-foreground">Feb 07, 2026</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            Patient presented with severe chest congestion and fever. Diagnosed with Acute Bronchitis.
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Right Column: Active Input Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="p-6 shadow-sm border-gray-200">
                                <div className="space-y-6">

                                    <div>
                                        <Label className="text-base">Current Symptoms & Complaints</Label>
                                        <Textarea
                                            placeholder="Detail the patient's current condition since the last visit..."
                                            className="mt-2 min-h-[100px] resize-none"
                                            value={symptoms}
                                            onChange={e => setSymptoms(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <Label className="text-base text-gray-700">Treatment Progress</Label>
                                            <select
                                                className="mt-2 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                value={progress || ""}
                                                onChange={(e: any) => setProgress(e.target.value)}
                                            >
                                                <option value="" disabled>Select patient progress</option>
                                                <option value="IMPROVING">Improving</option>
                                                <option value="SAME">Same / No Change</option>
                                                <option value="WORSE">Worsening</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <Label className="text-base">Updated Prescription</Label>
                                        <Textarea
                                            placeholder="Enter completely new prescription or write 'Continue previous'..."
                                            className="mt-2 min-h-[100px] resize-none focus-visible:ring-emerald-500"
                                            value={prescription}
                                            onChange={e => setPrescription(e.target.value)}
                                        />
                                    </div>

                                </div>
                            </Card>

                            <Card className="p-6 shadow-sm border-gray-200 bg-gray-50/50">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-5 items-center">
                                        <input
                                            id="schedule-followup"
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                            checked={scheduleFollowUp}
                                            onChange={(e) => {
                                                setScheduleFollowUp(e.target.checked);
                                                if (!e.target.checked) setAdditionalFollowUpDate("");
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor="schedule-followup" className="font-medium text-gray-900 cursor-pointer">
                                            Require another Follow-Up?
                                        </label>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            If left unchecked, this patient's status will automatically upgrade to <span className="font-semibold text-emerald-600">Cured</span> upon finalization.
                                        </p>

                                        {scheduleFollowUp && (
                                            <div className="mt-4 max-w-xs">
                                                <Input
                                                    type="date"
                                                    value={additionalFollowUpDate}
                                                    min={new Date().toISOString().split("T")[0]}
                                                    onChange={(e) => setAdditionalFollowUpDate(e.target.value)}
                                                    className="w-full"
                                                />
                                                <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1 font-medium">
                                                    <ActivityIcon className="w-3 h-3" />
                                                    Patient will remain Under Treatment.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" size="lg" className="px-8 rounded-full" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button
                                    size="lg"
                                    className="px-8 rounded-full bg-indigo-600 hover:bg-indigo-700"
                                    onClick={handleFinalize}
                                    disabled={saving || !symptoms || !progress || (scheduleFollowUp && !additionalFollowUpDate)}
                                >
                                    {saving ? "Finalizing..." : "Finalize Consultation"}
                                </Button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HistoryIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>;
}

function ActivityIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
}
