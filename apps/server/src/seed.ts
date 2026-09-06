import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// Base URL for video room links — override with APP_URL env var in production
const APP_URL = process.env.APP_URL?.replace(/\/$/, "") || "http://15.206.15.61";

async function main() {
  console.log("🗑️  Clearing existing data...");

  // TRUNCATE CASCADE handles all FK dependencies in one shot —
  // safer than manually ordering deleteMany calls
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog",
      "FollowUpCall",
      "FollowUp",
      "Consult",
      "Medication",
      "Condition",
      "Appointment",
      "Vitals",
      "Patient",
      "User"
    RESTART IDENTITY CASCADE
  `);

  console.log("✅ Cleared. Seeding fresh data...\n");

  // ── Users ──────────────────────────────────────────────────────────────────
  const doctor = await prisma.user.create({
    data: {
      name: "Dr. Arun Sharma",
      role: "DOCTOR",
      aadhaarNumber: "111111111111",
      specialization: "General Medicine",
    },
  });

  const nurse = await prisma.user.create({
    data: {
      name: "Nurse Priya Patel",
      role: "NURSE",
      aadhaarNumber: "000000000000",
    },
  });

  const patientUser1 = await prisma.user.create({
    data: {
      name: "Rahul Mehta",
      role: "PATIENT",
      aadhaarNumber: "222222222222",
      phone: "9876543210",
      gender: "Male",
      dob: new Date("1995-06-15"),
      bloodGroup: "B+",
    },
  });

  const patientUser2 = await prisma.user.create({
    data: {
      name: "Sneha Iyer",
      role: "PATIENT",
      aadhaarNumber: "333333333333",
      phone: "9123456780",
      gender: "Female",
      dob: new Date("1990-01-20"),
      bloodGroup: "O+",
    },
  });

  console.log("👤 Users seeded:");
  console.log(`   Doctor  → ${doctor.name} (${doctor.aadhaarNumber})`);
  console.log(`   Nurse   → ${nurse.name} (${nurse.aadhaarNumber})`);
  console.log(`   Patient → ${patientUser1.name} (${patientUser1.aadhaarNumber})`);
  console.log(`   Patient → ${patientUser2.name} (${patientUser2.aadhaarNumber})`);

  // ── Patients ───────────────────────────────────────────────────────────────
  const patient1 = await prisma.patient.create({
    data: {
      name: "Rahul Mehta",
      aadhaarNumber: "222222222222",
      gender: "Male",
      phone: "9876543210",
      dob: new Date("1995-06-15"),
      bloodGroup: "B+",
      status: "WAITING",
      createdBy: nurse.id,
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      name: "Sneha Iyer",
      aadhaarNumber: "333333333333",
      gender: "Female",
      phone: "9123456780",
      dob: new Date("1990-01-20"),
      bloodGroup: "O+",
      status: "WAITING",
      createdBy: nurse.id,
    },
  });

  console.log("\n🏥 Patients seeded:");
  console.log(`   ${patient1.name} (id: ${patient1.id})`);
  console.log(`   ${patient2.name} (id: ${patient2.id})`);

  // ── Vitals ─────────────────────────────────────────────────────────────────
  await prisma.vitals.create({
    data: {
      patientId: patient1.id,
      bloodPressure: "120/80",
      heartRate: 76,
      temperature: 98.6,
      oxygenSat: 98,
      weight: 72,
      height: 175,
      symptoms: JSON.stringify(["headache", "mild fever"]),
      notes: "Patient reports symptoms for 2 days",
    },
  });

  await prisma.vitals.create({
    data: {
      patientId: patient2.id,
      bloodPressure: "110/70",
      heartRate: 68,
      temperature: 99.1,
      oxygenSat: 97,
      weight: 58,
      height: 162,
      symptoms: JSON.stringify(["cough", "sore throat"]),
    },
  });

  console.log("\n💉 Vitals seeded for both patients");

  // ── Appointments ───────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const videoRoomId1 = crypto.randomUUID();
  const videoRoomId2 = crypto.randomUUID();

  const appt1 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: doctor.id,
      doctorName: doctor.name,
      type: "videoConsultation",
      reason: "FeverCold",
      symptoms: "Headache and mild fever for 2 days",
      preferredDate: today,
      timeSlot: "10:00 AM - 10:30 AM",
      mobile: "9876543210",
      status: "confirmed",
      roomId: videoRoomId1,
      videoLink: `${APP_URL}/video-room/${videoRoomId1}`,
    },
  });

  const appt2 = await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      doctorId: doctor.id,
      doctorName: doctor.name,
      type: "videoConsultation",
      reason: "RoutineCheckUp",
      symptoms: "Cough and sore throat",
      preferredDate: today,
      timeSlot: "11:00 AM - 11:30 AM",
      mobile: "9123456780",
      status: "pending",
      roomId: videoRoomId2,
      videoLink: `${APP_URL}/video-room/${videoRoomId2}`,
    },
  });

  const appt3 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: doctor.id,
      doctorName: doctor.name,
      type: "inClinic",
      reason: "FollowUp",
      preferredDate: tomorrow,
      timeSlot: "02:00 PM - 02:30 PM",
      mobile: "9876543210",
      status: "pending",
    },
  });

  const appt4 = await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      type: "followUpCall",
      reason: "FollowUp",
      preferredDate: tomorrow,
      timeSlot: "03:00 PM - 03:30 PM",
      mobile: "9123456780",
      status: "pending",
    },
  });

  console.log("\n📅 Appointments seeded:");
  console.log(`   ${appt1.id} — Video confirmed  today    — ${patient1.name}`);
  console.log(`   ${appt2.id} — Video pending    today    — ${patient2.name}`);
  console.log(`   ${appt3.id} — In-clinic        tomorrow — ${patient1.name}`);
  console.log(`   ${appt4.id} — Follow-up call   tomorrow — ${patient2.name}`);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Seed complete! Login at ${APP_URL}/signin

   Role     Aadhaar        OTP
   ──────── ────────────── ──────
   Doctor   111111111111   123456
   Nurse    000000000000   123456
   Patient  222222222222   123456
   Patient  333333333333   123456
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
