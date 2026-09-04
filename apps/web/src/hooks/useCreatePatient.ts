import { useState } from "react";
import { patientApi } from "@/services/api";

export function useCreatePatient() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPatient(data: {
    name: string;
    gender: string;
    phone?: string;
    dob?: string;
    aadhaarNumber?: string;
    bloodGroup?: string;
    emergencyContact?: string;
    status?: string;
    vitals?: Record<string, unknown>;
  }) {
    setIsSubmitting(true);
    setError(null);
    try {
      const patient = await patientApi.create(data);
      return patient;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to create patient";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { createPatient, isSubmitting, error };
}
