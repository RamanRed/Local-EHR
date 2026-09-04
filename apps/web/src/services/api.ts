import axios from "axios";
import type {
  AuthResponse,
  AadhaarSendOtpPayload,
  AadhaarVerifyOtpPayload,
  AadhaarVerifyOtpResponse,
  AadhaarOnboardPayload,
  UpdateProfilePayload,
  UserPublic,
  Patient,
  PatientSearchResult,
  Consult,
  ConsultWithPatient,
  Appointment,
  FollowUpWithRelations,
  FollowUpCall,
} from "@vox/shared-types";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authApi = {
  getMe: () =>
    api.get<{ user: UserPublic }>("/auth/me").then((r) => r.data.user),

  sendAadhaarOtp: (data: AadhaarSendOtpPayload) =>
    api.post<{ message: string }>("/auth/aadhaar/send-otp", data).then((r) => r.data),

  verifyAadhaarOtp: (data: AadhaarVerifyOtpPayload) =>
    api.post<AadhaarVerifyOtpResponse>("/auth/aadhaar/verify-otp", data).then((r) => r.data),

  aadhaarOnboard: (data: AadhaarOnboardPayload) =>
    api.post<AuthResponse>("/auth/aadhaar/onboard", data).then((r) => r.data),

  updateProfile: (data: UpdateProfilePayload) =>
    api.patch<{ user: UserPublic }>("/auth/profile", data).then((r) => r.data.user),
};

// Patients
export const patientApi = {
  list: (status?: string) =>
    api
      .get<Patient[]>("/patients", { params: status ? { status } : {} })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<Patient>(`/patients/${id}`).then((r) => r.data),

  searchByAadhaar: (aadhaar: string) =>
    api.get<PatientSearchResult>("/patients/search", { params: { aadhaar } }).then((r) => r.data),

  create: (data: {
    name: string;
    gender: string;
    phone?: string;
    dob?: string;
    aadhaarNumber?: string;
    bloodGroup?: string;
    emergencyContact?: string;
    status?: string;
    vitals?: Record<string, unknown>;
  }) => api.post<Patient>("/patients", data).then((r) => r.data),

  update: (id: string, data: {
    name?: string;
    dob?: string;
    gender?: string;
    phone?: string;
    aadhaarNumber?: string;
    bloodGroup?: string;
    emergencyContact?: string;
    vitals?: Record<string, unknown>;
  }) => api.patch<Patient>(`/patients/${id}`, data).then((r) => r.data),

  revisit: (id: string, data: {
    name?: string;
    gender?: string;
    phone?: string;
    dob?: string;
    bloodGroup?: string;
    emergencyContact?: string;
    status?: string;
    vitals?: Record<string, unknown>;
  }) => api.post<Patient>(`/patients/${id}/revisit`, data).then((r) => r.data),

  updateStatus: (id: string, status: string) =>
    api.patch<Patient>(`/patients/${id}/status`, { status }).then((r) => r.data),
};

// Consults
export const consultApi = {
  create: (data: { patientId: string; transcript?: string; isFollowUp?: boolean; fulfilledFollowUpId?: string }) =>
    api.post<Consult>("/consults", data).then((r) => r.data),

  getById: (id: string) =>
    api.get<Consult>(`/consults/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<Consult>) =>
    api.patch<Consult>(`/consults/${id}`, data).then((r) => r.data),

  getByPatient: (patientId: string) =>
    api.get<Consult[]>(`/patients/${patientId}/consults`).then((r) => r.data),

  listByDoctor: () =>
    api.get<ConsultWithPatient[]>("/consults").then((r) => r.data),
};

// Follow-Ups
export const followUpApi = {
  list: (doctorId?: string) =>
    api.get<FollowUpWithRelations[]>("/follow-ups", { params: doctorId ? { doctorId } : {} }).then((r) => r.data),

  getByPatient: (patientId: string) =>
    api.get<FollowUpWithRelations[]>(`/follow-ups/patient/${patientId}`).then((r) => r.data),

  getById: (id: string) =>
    api.get<FollowUpWithRelations>(`/follow-ups/${id}`).then((r) => r.data),

  updateStatus: (id: string, status: string) =>
    api.patch<FollowUpWithRelations>(`/follow-ups/${id}/status`, { status }).then((r) => r.data),
};

// AI
export const aiApi = {
  analyze: (data: {
    transcript?: string;
    symptoms?: string[];
    vitals?: Record<string, unknown>;
    previousSummary?: string;
  }) => api.post("/ai/analyze", data).then((r) => r.data),

  transcribe: (audio: string, mimeType: string) =>
    api.post<{ text: string }>("/ai/transcribe", { audio, mimeType }).then((r) => r.data),

  summarize: (data: {
    soap: { subjective: string; objective: string; assessment: string; plan: string };
    icdCodes?: { code: string; description: string }[];
    symptoms?: string[];
    patientName?: string;
  }) => api.post<{ summary: string }>("/ai/summarize", data).then((r) => r.data),

  suggest: (symptoms: string) =>
    api.post("/ai/suggest", { symptoms }).then((r) => r.data),

  suggestConfirm: (data: {
    session_id: string;
    selected_icd_codes: string[];
    patient_info?: Record<string, unknown>;
    vitals?: Record<string, unknown>;
  }) => api.post("/ai/suggest/confirm", data).then((r) => r.data),
};

// Upload
export const uploadApi = {
  image: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post<{ url: string }>("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.url);
  },
};

// Appointments
export const appointmentApi = {
  create: (data: {
    patientId: string;
    type: string;
    reason?: string;
    symptoms?: string;
    preferredDate: string;
    timeSlot: string;
    mobile: string;
    doctorId?: string;
    doctorName?: string;
  }) => api.post<Appointment>("/appointments", data).then((r) => r.data),

  list: (params?: { status?: string; date?: string }) =>
    api.get<Appointment[]>("/appointments", { params }).then((r) => r.data),

  listMine: () =>
    api.get<Appointment[]>("/appointments/my").then((r) => r.data),

  getById: (id: string) =>
    api.get<Appointment>(`/appointments/${id}`).then((r) => r.data),

  update: (id: string, data: { status?: string; doctorId?: string; doctorName?: string }) =>
    api.patch<Appointment>(`/appointments/${id}`, data).then((r) => r.data),

  updateStatus: (id: string, status: string) =>
    api.patch<Appointment>(`/appointments/${id}/status`, { status }).then((r) => r.data),
};

// Follow-Up Calls
export const followUpCallApi = {
  cancel: (id: string) =>
    api.patch<FollowUpCall>(`/followup-calls/${id}/cancel`).then((r) => r.data),

  list: (params?: { patientId?: string; status?: string }) =>
    api.get<FollowUpCall[]>("/followup-calls", { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<FollowUpCall>(`/followup-calls/${id}`).then((r) => r.data),
};

// Stats
export const statsApi = {
  nurse: () => api.get("/stats/nurse").then((r) => r.data),
  doctor: () => api.get("/stats/doctor").then((r) => r.data),
  patient: () => api.get("/stats/patient").then((r) => r.data),
};

export default api;
