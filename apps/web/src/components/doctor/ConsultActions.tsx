import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, Loader2 } from "lucide-react";

interface ConsultActionsProps {
  patientSummary: string;
  followUpDate: string;
  isFollowUpEnabled: boolean;
  isGeneratingSummary?: boolean;
  onSummaryChange: (value: string) => void;
  onFollowUpChange: (value: string) => void;
  onFollowUpToggle: (enabled: boolean) => void;
  onGenerateSummary?: () => void;
  onFinalize: () => void;
  canFinalize: boolean;
}

export function ConsultActions({
  patientSummary,
  followUpDate,
  isFollowUpEnabled,
  isGeneratingSummary,
  onSummaryChange,
  onFollowUpChange,
  onFollowUpToggle,
  onGenerateSummary,
  onFinalize,
  canFinalize,
}: ConsultActionsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Finalize Consultation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="patientSummary">Patient Summary</Label>
            {onGenerateSummary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onGenerateSummary}
                disabled={isGeneratingSummary}
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Generate with AI
                  </>
                )}
              </Button>
            )}
          </div>
          <Textarea
            id="patientSummary"
            placeholder="AI-generated summary will appear here. You can edit before finalizing..."
            value={patientSummary}
            onChange={(e) => onSummaryChange(e.target.value)}
            rows={5}
          />
        </div>
        <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={isFollowUpEnabled}
              onChange={(e) => onFollowUpToggle(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Schedule Follow-up
          </label>

          {isFollowUpEnabled && (
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="followUpDate">Follow-up Date <span className="text-red-500">*</span></Label>
              <Input
                id="followUpDate"
                type="date"
                value={followUpDate}
                onChange={(e) => onFollowUpChange(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          )}
        </div>
        <Button
          onClick={onFinalize}
          disabled={!canFinalize}
          className="w-full"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Finalize Consultation
        </Button>
      </CardContent>
    </Card>
  );
}
