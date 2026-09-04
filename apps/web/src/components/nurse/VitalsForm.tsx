import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

interface VitalsFormProps {
  values: {
    bloodPressure: string;
    heartRate: string;
    temperature: string;

    weight: string;
    height: string;
  };
  onChange: (field: string, value: string) => void;
}

export function VitalsForm({ values, onChange }: VitalsFormProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <FormField label="Blood Pressure" htmlFor="bloodPressure">
        <Input
          id="bloodPressure"
          placeholder="e.g. 120/80"
          value={values.bloodPressure}
          onChange={(e) => onChange("bloodPressure", e.target.value)}
        />
      </FormField>
      <FormField label="Heart Rate (bpm)" htmlFor="heartRate">
        <Input
          id="heartRate"
          type="number"
          placeholder="e.g. 72"
          value={values.heartRate}
          onChange={(e) => onChange("heartRate", e.target.value)}
        />
      </FormField>
      <FormField label="Temperature (°F)" htmlFor="temperature">
        <Input
          id="temperature"
          type="number"
          step="0.1"
          placeholder="e.g. 98.6"
          value={values.temperature}
          onChange={(e) => onChange("temperature", e.target.value)}
        />
      </FormField>

      <FormField label="Weight (kg)" htmlFor="weight">
        <Input
          id="weight"
          type="number"
          step="0.1"
          placeholder="e.g. 70"
          value={values.weight}
          onChange={(e) => onChange("weight", e.target.value)}
        />
      </FormField>
      <FormField label="Height (cm)" htmlFor="height">
        <Input
          id="height"
          type="number"
          placeholder="e.g. 170"
          value={values.height}
          onChange={(e) => onChange("height", e.target.value)}
        />
      </FormField>
    </div>
  );
}
