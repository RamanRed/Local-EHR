import type { Patient, Vitals, Consult } from "@vox/shared-types";

// TODO: Replace mock data with API calls once backend CRUD routes are built

// ─── Mock Vitals ───

const vitals1: Vitals = {
  id: "v1",
  patientId: "p1",
  bloodPressure: "130/85",
  heartRate: 88,
  temperature: 99.2,
  oxygenSat: 97,
  bloodGlucose: 110,
  weight: 72,
  height: 170,
  symptoms: ["Headache", "Dizziness", "Fatigue"],
  notes: "Patient reports symptoms started 2 days ago",
  recordedAt: "2026-02-21T09:30:00Z",
};

const vitals2: Vitals = {
  id: "v2",
  patientId: "p2",
  bloodPressure: "160/100",
  heartRate: 110,
  temperature: 101.5,
  oxygenSat: 93,
  bloodGlucose: 250,
  weight: 85,
  height: 175,
  symptoms: ["Chest Pain", "Shortness of Breath", "Sweating"],
  notes: "URGENT: Patient brought in by ambulance",
  recordedAt: "2026-02-21T08:15:00Z",
};

const vitals3: Vitals = {
  id: "v3",
  patientId: "p3",
  bloodPressure: "120/80",
  heartRate: 72,
  temperature: 98.6,
  oxygenSat: 99,
  bloodGlucose: 95,
  weight: 65,
  height: 162,
  symptoms: ["Sore Throat", "Cough", "Runny Nose"],
  notes: null,
  recordedAt: "2026-02-21T10:00:00Z",
};

const vitals4: Vitals = {
  id: "v4",
  patientId: "p4",
  bloodPressure: "118/76",
  heartRate: 68,
  temperature: 98.4,
  oxygenSat: 98,
  bloodGlucose: 88,
  weight: 58,
  height: 155,
  symptoms: ["Back Pain", "Stiffness"],
  notes: "Follow-up visit",
  recordedAt: "2026-02-21T07:45:00Z",
};

const vitals5: Vitals = {
  id: "v5",
  patientId: "p5",
  bloodPressure: "125/82",
  heartRate: 80,
  temperature: 99.8,
  oxygenSat: 96,
  bloodGlucose: 120,
  weight: 90,
  height: 180,
  symptoms: ["Abdominal Pain", "Nausea", "Loss of Appetite"],
  notes: null,
  recordedAt: "2026-02-21T11:20:00Z",
};

const vitals6: Vitals = {
  id: "v6",
  patientId: "p6",
  bloodPressure: "115/75",
  heartRate: 74,
  temperature: 98.6,
  oxygenSat: 99,
  bloodGlucose: 92,
  weight: 70,
  height: 168,
  symptoms: ["Knee Pain"],
  notes: "Post-surgery follow-up, healing well",
  recordedAt: "2026-02-20T14:00:00Z",
};

// ─── Mock Patients ───

export const mockPatients: Patient[] = [
  {
    id: "p1",
    name: "Arjun Mehta",
    dob: "1992-03-15",
    gender: "Male",
    phone: "+91 98765 43210",
    photoUrl: null,
    status: "WAITING",
    createdBy: "nurse1",
    createdAt: "2026-02-21T09:30:00Z",
    updatedAt: "2026-02-21T09:30:00Z",
    vitals: vitals1,
  },
  {
    id: "p2",
    name: "Priya Sharma",
    dob: "1970-07-22",
    gender: "Female",
    phone: "+91 91234 56789",
    photoUrl: null,
    status: "EMERGENCY",
    createdBy: "nurse1",
    createdAt: "2026-02-21T08:15:00Z",
    updatedAt: "2026-02-21T08:15:00Z",
    vitals: vitals2,
  },
  {
    id: "p3",
    name: "Rahul Patel",
    dob: "1998-01-10",
    gender: "Male",
    phone: "+91 87654 32109",
    photoUrl: null,
    status: "WAITING",
    createdBy: "nurse1",
    createdAt: "2026-02-21T10:00:00Z",
    updatedAt: "2026-02-21T10:00:00Z",
    vitals: vitals3,
  },
  {
    id: "p4",
    name: "Anita Desai",
    dob: "1981-05-18",
    gender: "Female",
    phone: "+91 76543 21098",
    photoUrl: null,
    status: "CURED",
    createdBy: "nurse1",
    createdAt: "2026-02-21T07:45:00Z",
    updatedAt: "2026-02-21T09:00:00Z",
    vitals: vitals4,
  },
  {
    id: "p5",
    name: "Vikram Singh",
    dob: "1964-11-03",
    gender: "Male",
    phone: "+91 65432 10987",
    photoUrl: null,
    status: "IN_CONSULT",
    createdBy: "nurse1",
    createdAt: "2026-02-21T11:20:00Z",
    updatedAt: "2026-02-21T11:45:00Z",
    vitals: vitals5,
  },
  {
    id: "p6",
    name: "Meera Joshi",
    dob: "1988-09-25",
    gender: "Female",
    phone: "+91 54321 09876",
    photoUrl: null,
    status: "CURED",
    createdBy: "nurse1",
    createdAt: "2026-02-20T14:00:00Z",
    updatedAt: "2026-02-20T16:30:00Z",
    vitals: vitals6,
  },
];

// ─── Mock Consults ───

export const mockConsults: Consult[] = [
  {
    id: "c1",
    patientId: "p4",
    doctorId: "doctor1",
    isFollowUp: false,
    transcript:
      "Patient reports lower back pain for the past week, worsening with prolonged sitting. No numbness or tingling in extremities.",
    soapSubjective:
      "Patient complains of lower back pain, ongoing for 7 days. Pain rated 5/10. Worse with prolonged sitting. No radiation to legs.",
    soapObjective:
      "BP 118/76, HR 68, Temp 98.4°F. Tenderness over L4-L5 region. ROM limited in flexion. Straight leg raise negative bilaterally.",
    soapAssessment: "Mechanical lower back pain, likely muscular strain.",
    soapPlan:
      "1. NSAIDs (Ibuprofen 400mg TID) for 5 days\n2. Hot fomentation\n3. Physiotherapy referral\n4. Follow up in 1 week if no improvement",
    icdCodes: [
      { code: "M54.5", description: "Low back pain" },
      { code: "M62.830", description: "Muscle spasm of back" },
    ],
    patientSummary:
      "You have a muscle strain in your lower back. Take the prescribed pain medication, apply heat, and start physiotherapy. If the pain doesn't improve in a week, please come back for a follow-up.",
    followUpDate: "2026-02-28",
    finalized: true,
    createdAt: "2026-02-21T08:00:00Z",
    updatedAt: "2026-02-21T09:00:00Z",
  },
  {
    id: "c2",
    patientId: "p5",
    doctorId: "doctor1",
    isFollowUp: false,
    transcript: "Patient complains of abdominal pain in the upper right quadrant...",
    soapSubjective:
      "Patient reports upper right abdominal pain, nausea, and loss of appetite for 3 days.",
    soapObjective: "BP 125/82, HR 80, Temp 99.8°F. Tenderness in RUQ. Murphy's sign positive.",
    soapAssessment: null,
    soapPlan: null,
    icdCodes: null,
    patientSummary: null,
    followUpDate: null,
    finalized: false,
    createdAt: "2026-02-21T11:45:00Z",
    updatedAt: "2026-02-21T11:45:00Z",
  },
  {
    id: "c3",
    patientId: "p6",
    doctorId: "doctor1",
    isFollowUp: false,
    transcript:
      "Post-operative follow up. Patient reports knee is healing well. Mild swelling remains.",
    soapSubjective:
      "Post-op follow-up for right knee arthroscopy. Patient reports improved mobility, mild swelling. Pain rated 2/10.",
    soapObjective:
      "BP 115/75, HR 74, Temp 98.6°F. Surgical site clean and dry. Mild effusion. ROM 0-120 degrees.",
    soapAssessment:
      "Satisfactory post-operative recovery following right knee arthroscopy.",
    soapPlan:
      "1. Continue physiotherapy\n2. Ice application as needed\n3. Gradual return to normal activities\n4. Final follow-up in 4 weeks",
    icdCodes: [
      { code: "Z96.651", description: "Presence of right artificial knee joint" },
      { code: "Z09", description: "Encounter for follow-up examination after completed treatment" },
    ],
    patientSummary:
      "Your knee is healing well after surgery. Continue your physiotherapy exercises, use ice if there's swelling, and gradually return to normal activities. Your final check-up is scheduled in 4 weeks.",
    followUpDate: "2026-03-20",
    finalized: true,
    createdAt: "2026-02-20T14:30:00Z",
    updatedAt: "2026-02-20T16:30:00Z",
  },
];

// ─── Dashboard Stats ───

export const nurseStats = {
  totalPatients: mockPatients.length,
  waiting: mockPatients.filter((p) => p.status === "WAITING").length,
  emergency: mockPatients.filter((p) => p.status === "EMERGENCY").length,
  completedToday: mockPatients.filter(
    (p) =>
      p.status === "CURED" &&
      p.updatedAt.startsWith("2026-02-21")
  ).length,
  underTreatment: mockPatients.filter((p) => p.status === "UNDER_TREATMENT").length,
};

export const doctorStats = {
  waiting: mockPatients.filter(
    (p) => p.status === "WAITING" || p.status === "EMERGENCY"
  ).length,
  inConsult: mockPatients.filter((p) => p.status === "IN_CONSULT").length,
  completedToday: mockPatients.filter(
    (p) =>
      p.status === "CURED" &&
      p.updatedAt.startsWith("2026-02-21")
  ).length,
  underTreatment: mockPatients.filter((p) => p.status === "UNDER_TREATMENT").length,
};

export const patientStats = {
  totalVisits: mockConsults.filter((c) => c.finalized).length,
  upcomingFollowUps: mockConsults.filter(
    (c) => c.followUpDate && new Date(c.followUpDate) > new Date()
  ).length,
};

// ─── Helpers ───

export function getPatientById(id: string): Patient | undefined {
  return mockPatients.find((p) => p.id === id);
}

export function getConsultsByPatientId(patientId: string): Consult[] {
  return mockConsults.filter((c) => c.patientId === patientId);
}

export function getWaitingPatients(): Patient[] {
  return mockPatients.filter(
    (p) => p.status === "WAITING" || p.status === "EMERGENCY"
  );
}
