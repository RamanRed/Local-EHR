import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SOAPValues {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SOAPEditorProps {
  values: SOAPValues;
  onChange: (field: keyof SOAPValues, value: string) => void;
}

const sections: { key: keyof SOAPValues; label: string; placeholder: string }[] = [
  {
    key: "subjective",
    label: "Subjective",
    placeholder: "Patient's complaints, history, and symptoms as reported...",
  },
  {
    key: "objective",
    label: "Objective",
    placeholder: "Physical examination findings, vitals, lab results...",
  },
  {
    key: "assessment",
    label: "Assessment",
    placeholder: "Diagnosis or differential diagnosis...",
  },
  {
    key: "plan",
    label: "Plan",
    placeholder: "Treatment plan, medications, follow-up instructions...",
  },
];

export function SOAPEditor({ values, onChange }: SOAPEditorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">SOAP Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <div key={section.key} className="space-y-1.5">
              <Label htmlFor={section.key}>{section.label}</Label>
              <Textarea
                id={section.key}
                placeholder={section.placeholder}
                value={values[section.key]}
                onChange={(e) => onChange(section.key, e.target.value)}
                rows={7}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
