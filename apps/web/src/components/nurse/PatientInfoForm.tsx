import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

interface PatientInfoFormProps {
  values: {
    name: string;
    dob: string;
    gender: string;
    phone: string;
    bloodGroup: string;
    emergencyContact: string;
  };
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function PatientInfoForm({ values, onChange, disabled }: PatientInfoFormProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Full Name" htmlFor="name">
        <Input
          id="name"
          placeholder="Patient's full name"
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          disabled={disabled}
        />
      </FormField>
      <FormField label="Date of Birth" htmlFor="dob">
        <Input
          id="dob"
          type="date"
          value={values.dob}
          onChange={(e) => onChange("dob", e.target.value)}
          disabled={disabled}
        />
      </FormField>
      <FormField label="Gender" htmlFor="gender">
        <select
          id="gender"
          value={values.gender}
          onChange={(e) => onChange("gender", e.target.value)}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </FormField>
      <FormField label="Phone" htmlFor="phone">
        <Input
          id="phone"
          placeholder="+91 XXXXX XXXXX"
          value={values.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          disabled={disabled}
        />
      </FormField>
      <FormField label="Blood Group" htmlFor="bloodGroup">
        <select
          id="bloodGroup"
          value={values.bloodGroup}
          onChange={(e) => onChange("bloodGroup", e.target.value)}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select blood group</option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Emergency Contact" htmlFor="emergencyContact">
        <Input
          id="emergencyContact"
          placeholder="+91 XXXXX XXXXX"
          value={values.emergencyContact}
          onChange={(e) => onChange("emergencyContact", e.target.value)}
          disabled={disabled}
        />
      </FormField>
    </div>
  );
}
