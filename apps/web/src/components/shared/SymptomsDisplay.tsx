import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SymptomsDisplayProps {
  symptoms: string[];
}

export function SymptomsDisplay({ symptoms }: SymptomsDisplayProps) {
  let symptomList: string[] = [];
  try {
    if (typeof symptoms === 'string') {
      symptomList = JSON.parse(symptoms);
    } else if (Array.isArray(symptoms)) {
      symptomList = symptoms;
    }
  } catch (e) {
    symptomList = [];
  }

  if (symptomList.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Symptoms</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {symptomList.map((symptom) => (
            <span
              key={symptom}
              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {symptom}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
