import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  // ── Users ──
  const doctor = await prisma.user.upsert({
    where: { aadhaarNumber: "111111111111" },
    update: {},
    create: {
      name: "Dr. Arun Sharma",
      role: "DOCTOR",
      aadhaarNumber: "111111111111",
      specialization: "General Medicine",
    },
  });

  const nurse = await prisma.user.upsert({
    where: { aadhaarNumber: "000000000000" },
    update: {},
    create: {
      name: "Nurse Priya Patel",
      role: "NURSE",
      aadhaarNumber: "000000000000",
    },
  });

  const patientUser = await prisma.user.upsert({
    where: { aadhaarNumber: "222222222222" },
    update: {},
    create: {
      name: "Rahul Mehta",
      role: "PATIENT",
      aadhaarNumber: "222222222222",
      phone: "9876543210",
      gender: "Male",
      dob: new Date("1995-06-15"),
      bloodGroup: "B+",
    },
  });

  const patientUser2 = await prisma.user.upsert({
    where: { aadhaarNumber: "333333333333" },
    update: {},
    create: {
      name: "Sneha Iyer",
      role: "PATIENT",
      aadhaarNumber: "333333333333",
      phone: "9123456780",
      gender: "Female",
      dob: new Date("1990-01-20"),
      bloodGroup: "O+",
    },
  });

  console.log("Seeded users:");
  console.log(`  Doctor:  ${doctor.name} (${doctor.aadhaarNumber})`);
  console.log(`  Nurse:   ${nurse.name} (${nurse.aadhaarNumber})`);
  console.log(`  Patient: ${patientUser.name} (${patientUser.aadhaarNumber})`);
  console.log(`  Patient: ${patientUser2.name} (${patientUser2.aadhaarNumber})`);

  // ── Patients ──
  const patient1 = await prisma.patient.upsert({
    where: { aadhaarNumber: "222222222222" },
    update: {},
    create: {
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

  const patient2 = await prisma.patient.upsert({
    where: { aadhaarNumber: "333333333333" },
    update: {},
    create: {
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

  console.log("Seeded patients:");
  console.log(`  ${patient1.name} (${patient1.id})`);
  console.log(`  ${patient2.name} (${patient2.id})`);

  // ── Vitals ──
  await prisma.vitals.upsert({
    where: { patientId: patient1.id },
    update: {},
    create: {
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

  await prisma.vitals.upsert({
    where: { patientId: patient2.id },
    update: {},
    create: {
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

  console.log("Seeded vitals for both patients");

  // ── Appointments ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const videoRoomId = crypto.randomUUID();

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
      roomId: videoRoomId,
      videoLink: `http://localhost:5173/video-room/${videoRoomId}`,
    },
  });

  const appt2 = await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      type: "videoConsultation",
      reason: "RoutineCheckUp",
      symptoms: "Cough and sore throat",
      preferredDate: today,
      timeSlot: "11:00 AM - 11:30 AM",
      mobile: "9123456780",
      status: "pending",
      roomId: crypto.randomUUID(),
      videoLink: `http://localhost:5173/video-room/${crypto.randomUUID()}`,
    },
  });

  const appt3 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
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

  console.log("Seeded appointments:");
  console.log(`  ${appt1.id} -Video (confirmed, today) -${patient1.name}`);
  console.log(`  ${appt2.id} -Video (pending, today)   -${patient2.name}`);
  console.log(`  ${appt3.id} -In-clinic (tomorrow)     -${patient1.name}`);
  console.log(`  ${appt4.id} -Follow-up call (tomorrow) -${patient2.name}`);

  console.log("\nDone! Use these Aadhaar numbers to log in:");
  console.log("  Doctor:  111111111111");
  console.log("  Nurse:   000000000000");
  console.log("  Patient: 222222222222 or 333333333333");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
