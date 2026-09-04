import { useState, useEffect } from "react";
import { format, isToday, isPast, isFuture } from "date-fns";
import { Calendar, CheckCircle, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FollowUpWithRelations } from "@vox/shared-types";
import { followUpApi } from "@/services/api";
import { useAuthStore } from "@/store";

type Tab = "ALL" | "TODAY" | "UPCOMING" | "OVERDUE" | "COMPLETED";

export default function FollowUpList() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<Tab>("ALL");
    const [followUps, setFollowUps] = useState<FollowUpWithRelations[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFollowUps = async () => {
        try {
            setLoading(true);
            const data = await followUpApi.list();
            setFollowUps(data);
        } catch (error) {
            console.error("Error fetching follow-ups:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFollowUps();
    }, []);

    const filteredFollowUps = followUps.filter((fu) => {
        if (activeTab === "COMPLETED") return fu.status === "COMPLETED";
        if (fu.status === "COMPLETED" || fu.status === "CANCELLED") return false;

        if (activeTab === "ALL") return true;

        const date = new Date(fu.followUpDate);
        if (activeTab === "TODAY") return isToday(date);
        if (activeTab === "UPCOMING") return isFuture(date) && !isToday(date);
        if (activeTab === "OVERDUE") return isPast(date) && !isToday(date);
        return false;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "WAITING":
                return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Waiting</Badge>;
            case "IN_CONSULT":
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Consult</Badge>;
            case "UNDER_TREATMENT":
                return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Under Treatment</Badge>;
            case "CURED":
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Cured</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: "ALL", label: "All Follow-Ups", icon: Calendar },
        { id: "TODAY", label: "Today", icon: Calendar },
        { id: "UPCOMING", label: "Upcoming", icon: Clock },
        { id: "OVERDUE", label: "Overdue", icon: AlertTriangle },
        { id: "COMPLETED", label: "Completed", icon: CheckCircle },
    ];

    if (loading) {
        return <div className="p-6 text-muted-foreground">Loading follow-ups...</div>;
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Follow-Ups</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage scheduled continuations of care.</p>
                </div>
            </div>

            <div className="flex space-x-2 border-b">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                            activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        <span className={cn(
                            "ml-1.5 rounded-full px-2 py-0.5 text-xs",
                            activeTab === tab.id ? "bg-primary/10" : "bg-muted"
                        )}>
                            {followUps.filter(f => {
                                if (tab.id === "COMPLETED") return f.status === "COMPLETED";
                                if (f.status === "COMPLETED" || f.status === "CANCELLED") return false;
                                if (tab.id === "ALL") return true;
                                const d = new Date(f.followUpDate);
                                if (tab.id === "TODAY") return isToday(d);
                                if (tab.id === "UPCOMING") return isFuture(d) && !isToday(d);
                                if (tab.id === "OVERDUE") return isPast(d) && !isToday(d);
                                return false;
                            }).length}
                        </span>
                    </button>
                ))}
            </div>

            {filteredFollowUps.length === 0 ? (
                <div className="text-center py-12 border rounded-xl bg-card border-dashed">
                    <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-medium">No follow-ups found</h3>
                    <p className="text-muted-foreground text-sm mt-1">There are no matching follow-up records for this category.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                                <th className="px-4 py-3 font-medium">Patient Details</th>
                                <th className="px-4 py-3 font-medium">Follow-Up Date</th>
                                <th className="px-4 py-3 font-medium">Current Status</th>
                                <th className="px-4 py-3 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFollowUps.map((fu) => (
                                <tr key={fu.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{fu.patient.name}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{fu.patient.phone || "No phone"}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{format(new Date(fu.followUpDate), "MMM d, yyyy")}</div>
                                        {isToday(new Date(fu.followUpDate)) && (
                                            <span className="text-xs font-medium text-amber-600">Today</span>
                                        )}
                                        {isPast(new Date(fu.followUpDate)) && !isToday(new Date(fu.followUpDate)) && fu.status !== "COMPLETED" && (
                                            <span className="text-xs font-medium text-red-600 ml-2">Overdue</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{getStatusBadge(fu.patient.status)}</td>
                                    <td className="px-4 py-3 text-right">
                                        {user?.role === "DOCTOR" && activeTab !== "COMPLETED" ? (
                                            <Button
                                                size="sm"
                                                onClick={() => navigate(`/doctor/follow-up-consult/${fu.id}`)}
                                                className="font-medium"
                                            >
                                                Start Consult
                                                <ChevronRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        ) : (
                                            <Button variant="outline" size="sm">
                                                View Details
                                            </Button>
                                        )}
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
