// ─── Enums ───

export type Role = "NURSE" | "DOCTOR" | "PATIENT";

export type PatientStatus = "WAITING" | "IN_CONSULT" | "UNDER_TREATMENT" | "CURED" | "EMERGENCY";

export type FollowUpStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export type AppointmentType = "followUpCall" | "inClinic" | "videoConsultation";

export type AppointmentReason =
  | "FollowUp"
  | "FeverCold"
  | "RoutineCheckUp"
  | "PainInjury"
  | "SkinIssues"
  | "DigestiveIssues"
  | "MentalHealth"
  | "Other";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

// ─── Auth ───

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface UserPublic {
  id: string;
  name: string;
  role: Role;
  phone?: string | null;
  email?: string | null;
  specialization?: string | null;
  photoUrl?: string | null;
  dob?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  email?: string;
  specialization?: string;
  photoUrl?: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  emergencyContact?: string;
}

// ─── Aadhaar Auth ───

export interface AadhaarSendOtpPayload {
  aadhaarNumber: string;
}

export interface AadhaarVerifyOtpPayload {
  aadhaarNumber: string;
  otp: string;
}

export interface AadhaarOnboardPayload {
  aadhaarNumber: string;
  name: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  emergencyContact?: string;
}

export type AadhaarVerifyOtpResponse =
  | AuthResponse
  | { needsOnboarding: true; aadhaarNumber: string };

// ─── Patient ───

export interface Patient {
  id: string;
  name: string;
  aadhaarNumber?: string | null;
  dob?: string | null;
  gender: string;
  phone?: string | null;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
  photoUrl?: string | null;
  status: PatientStatus;
  consultSummary?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  vitals?: Vitals | null;
}

export type PatientSearchResult =
  | { source: "patient"; patient: Patient }
  | { source: "user"; user: { name: string; dob?: string | null; gender?: string | null; bloodGroup?: string | null; emergencyContact?: string | null } };

// ─── Vitals ───

export interface Vitals {
  id: string;
  patientId: string;
  bloodPressure?: string | null;
  heartRate?: number | null;
  temperature?: number | null;
  oxygenSat?: number | null;
  bloodGlucose?: number | null;
  weight?: number | null;
  height?: number | null;
  symptoms: string[];
  notes?: string | null;
  recordedAt: string;
}

// ─── Consult ───

export interface IcdCode {
  code: string;
  description: string;
}

export interface Consult {
  id: string;
  patientId: string;
  doctorId: string;
  transcript?: string | null;
  soapSubjective?: string | null;
  soapObjective?: string | null;
  soapAssessment?: string | null;
  soapPlan?: string | null;
  icdCodes?: IcdCode[] | null;
  patientSummary?: string | null;
  followUpDate?: string | null;
  finalized: boolean;
  isFollowUp: boolean;
  progressNote?: string | null;
  prescription?: string | null;
  symptoms?: string | null;
  fulfilledFollowUpId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultWithPatient extends Consult {
  patient: { id: string; name: string };
}

// ─── Appointment ───

export interface Appointment {
  id: string;
  patientId: string;
  patient?: { id: string; name: string };
  doctorId?: string | null;
  doctorName?: string | null;
  type: AppointmentType;
  reason?: AppointmentReason | null;
  symptoms?: string | null;
  preferredDate: string;
  timeSlot: string;
  mobile: string;
  status: AppointmentStatus;
  roomId?: string | null;
  videoLink?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Follow Up ───

export interface FollowUp {
  id: string;
  patientId: string;
  doctorId: string;
  baseConsultId: string;
  followUpDate: string;
  status: FollowUpStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpWithRelations extends FollowUp {
  patient: { id: string; name: string; phone: string | null; status: string };
}

export interface FollowUpWithConsults extends FollowUp {
  fulfillingConsults: {
    id: string;
    createdAt: string;
    patientSummary: string | null;
    prescription: string | null;
    progressNote: string | null;
  }[];
}

// ─── Follow-Up Call ───

export type FollowUpCallStatus = "scheduled" | "in_progress" | "completed" | "failed" | "cancelled";
export type UrgencyLevel = "none" | "low" | "medium" | "high" | "critical";

export interface FollowUpCallStructuredFindings {
  symptomChanges: string;
  medicationAdherence: string;
  newSymptoms: string[];
  urgencyLevel: UrgencyLevel;
  keyFindings: string[];
  patientMood: string;
  followUpRecommendation: string;
}

export interface FollowUpCall {
  id: string;
  patientId: string;
  patient?: { id: string; name: string };
  consultId: string;
  initiatedBy: string;
  status: FollowUpCallStatus;
  transcript?: string | null;
  summary?: string | null;
  structuredFindings?: FollowUpCallStructuredFindings | null;
  urgencyLevel: UrgencyLevel;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationSeconds?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LiveTranscriptEvent {
  type: "transcript" | "call_status" | "summary";
  role?: "user" | "model";
  text?: string;
  status?: string;
  summary?: string;
  structuredFindings?: FollowUpCallStructuredFindings | null;
}

// ─── API Responses ───

export interface ApiError {
  message: string;
}
