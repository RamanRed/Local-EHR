import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.middleware.js";
import { PHIEncryption } from "../services/phi-encryption.js";
import { HIPAALogger } from "../services/hipaa-logger.js";

const router: Router = Router();

function normalizeSymptomsInput(symptoms: unknown): string[] {
  if (Array.isArray(symptoms)) {
    return symptoms
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof symptoms !== "string") return [];

  const raw = symptoms.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } catch {
    // Fall through to comma-separated parsing.
  }

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function serializeSymptoms(symptoms: unknown): string {
  return JSON.stringify(normalizeSymptomsInput(symptoms));
}

function normalizeIcdCodesInput(icdCodes: unknown): { code: string; description: string }[] {
  if (Array.isArray(icdCodes)) {
    return icdCodes
      .filter((c): c is { code: string; description: string } => {
        if (!c || typeof c !== "object") return false;
        const code = (c as { code?: unknown }).code;
        const description = (c as { description?: unknown }).description;
        return typeof code === "string" && typeof description === "string";
      })
      .map((c) => ({ code: c.code.trim(), description: c.description.trim() }))
      .filter((c) => c.code && c.description);
  }

  if (typeof icdCodes !== "string") return [];

  const raw = icdCodes.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeIcdCodesInput(parsed) : [];
  } catch {
    return [];
  }
}

function mapPatientForClient(patient: any) {
  if (!patient?.vitals) return patient;

  return {
    ...patient,
    vitals: {
      ...patient.vitals,
      symptoms: normalizeSymptomsInput(patient.vitals.symptoms),
    },
  };
}

// ─── GET /api/patients/search?aadhaar= ───────────────────────────────────────
router.get(
  "/search",
  requireRole("NURSE", "DOCTOR"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { aadhaar } = req.query;
      if (!aadhaar || typeof aadhaar !== "string" || !/^\d{12}$/.test(aadhaar.trim())) {
        res.status(400).json({ message: "Valid 12-digit Aadhaar number is required" });
        return;
      }

      const aadhaarNumber = aadhaar.trim();

      // 1. Check Patient records (most recent visit)
      const patient = await prisma.patient.findUnique({
        where: { aadhaarNumber },
        include: { vitals: true },
      });

      if (patient) {
        await HIPAALogger.logAccess(req.user!.userId, "patient", patient.id, "READ", { context: "Aadhaar search" });
        res.json({ source: "patient", patient: mapPatientForClient(patient) });
        return;
      }

      // 2. Check User records (registered but no patient visit yet)
      const user = await prisma.user.findUnique({
        where: { aadhaarNumber },
        select: { name: true, dob: true, gender: true, bloodGroup: true, emergencyContact: true },
      });

      if (user && user.name) {
        await HIPAALogger.logAccess(req.user!.userId, "user", null, "READ", { context: "Aadhaar search" });
        res.json({ source: "user", user });
        return;
      }

      await HIPAALogger.logAccess(req.user!.userId, "patient", null, "DENY", { context: "Aadhaar search -not found" });
      res.status(404).json({ message: "No patient found with this Aadhaar number" });
    } catch (error) {
      console.error("Search patient error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── GET /api/patients ───────────────────────────────────────────────────────
router.get(
  "/",
  requireRole("NURSE", "DOCTOR"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { status } = req.query;
      const where: any = status ? { status: status as string } : {};
      const patients = await prisma.patient.findMany({
        where,
        include: { vitals: true },
        orderBy: { createdAt: "desc" },
      });

      await HIPAALogger.logAccess(req.user!.userId, "patient_list", null, "READ", { statusFilter: status || "all" });
      res.json(patients.map(mapPatientForClient));
    } catch (error) {
      console.error("List patients error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── GET /api/patients/:id ───────────────────────────────────────────────────
router.get(
  "/:id",
  requireRole("NURSE", "DOCTOR"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = req.params.id as string;
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: { vitals: true, consults: { orderBy: { createdAt: "desc" } } },
      });
      if (!patient) {
        await HIPAALogger.logAccess(req.user!.userId, "patient", patientId, "DENY", { reason: "Not found" });
        res.status(404).json({ message: "Patient not found" });
        return;
      }

      await HIPAALogger.logAccess(req.user!.userId, "patient", patientId, "READ");

      // Decrypt the rolling consultation summary for the client
      const result: any = mapPatientForClient(patient);
      if (patient.consultSummary) {
        result.consultSummary = PHIEncryption.decrypt(patient.consultSummary);
      }
      res.json(result);
    } catch (error) {
      console.error("Get patient error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── POST /api/patients ──────────────────────────────────────────────────────
router.post(
  "/",
  requireRole("NURSE"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, gender, phone, dob, aadhaarNumber, bloodGroup, emergencyContact, status, vitals } = req.body;

      if (!name || !gender) {
        res.status(400).json({ message: "Name and gender are required" });
        return;
      }

      // Encrypt sensitive vitals notes
      const vitalsPayload = vitals
        ? {
          bloodPressure: vitals.bloodPressure || null,
          heartRate: vitals.heartRate ? Number(vitals.heartRate) : null,
          temperature: vitals.temperature ? Number(vitals.temperature) : null,
          oxygenSat: vitals.oxygenSat ? Number(vitals.oxygenSat) : null,
          bloodGlucose: vitals.bloodGlucose ? Number(vitals.bloodGlucose) : null,
          weight: vitals.weight ? Number(vitals.weight) : null,
          height: vitals.height ? Number(vitals.height) : null,
          symptoms: serializeSymptoms(vitals.symptoms),
          notes: vitals.notes ? PHIEncryption.encrypt(vitals.notes) : null,
        }
        : undefined;

      let patient;

      if (aadhaarNumber) {
        patient = await prisma.patient.upsert({
          where: { aadhaarNumber },
          update: {
            name,
            gender,
            phone: phone || null,
            dob: dob ? new Date(dob) : null,
            bloodGroup: bloodGroup || null,
            emergencyContact: emergencyContact || null,
            status: status || "WAITING",
            vitals: vitalsPayload
              ? { upsert: { create: vitalsPayload, update: vitalsPayload } }
              : undefined,
          },
          create: {
            name,
            gender,
            phone: phone || null,
            dob: dob ? new Date(dob) : null,
            aadhaarNumber,
            bloodGroup: bloodGroup || null,
            emergencyContact: emergencyContact || null,
            status: status || "WAITING",
            createdBy: req.user!.userId,
            vitals: vitalsPayload ? { create: vitalsPayload } : undefined,
          },
          include: { vitals: true },
        });
      } else {
        patient = await prisma.patient.create({
          data: {
            name,
            gender,
            phone: phone || null,
            dob: dob ? new Date(dob) : null,
            bloodGroup: bloodGroup || null,
            emergencyContact: emergencyContact || null,
            status: status || "WAITING",
            createdBy: req.user!.userId,
            vitals: vitalsPayload ? { create: vitalsPayload } : undefined,
          },
          include: { vitals: true },
        });
      }

      await HIPAALogger.logAccess(req.user!.userId, "patient", patient.id, "WRITE", { action: "create/upsert" });
      res.status(201).json(mapPatientForClient(patient));
    } catch (error: any) {
      if (error?.code === "P2002") {
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes("aadhaarNumber")) {
          res.status(409).json({ message: "A patient with this Aadhaar number already exists" });
          return;
        }
        res.status(409).json({ message: "A patient with these details already exists" });
        return;
      }
      console.error("Create patient error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── POST /api/patients/:id/revisit ──────────────────────────────────────────
router.post(
  "/:id/revisit",
  requireRole("NURSE"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = req.params.id as string;
      const { name, gender, phone, dob, bloodGroup, emergencyContact, status, vitals } = req.body;

      const patientData: Record<string, unknown> = {
        status: status || "WAITING",
      };
      if (name !== undefined) patientData.name = name;
      if (dob !== undefined) patientData.dob = dob ? new Date(dob) : null;
      if (gender !== undefined) patientData.gender = gender;
      if (phone !== undefined) patientData.phone = phone || null;
      if (bloodGroup !== undefined) patientData.bloodGroup = bloodGroup || null;
      if (emergencyContact !== undefined) patientData.emergencyContact = emergencyContact || null;

      if (vitals) {
        patientData.vitals = {
          upsert: {
            create: {
              bloodPressure: vitals.bloodPressure || null,
              heartRate: vitals.heartRate ? Number(vitals.heartRate) : null,
              temperature: vitals.temperature ? Number(vitals.temperature) : null,
              oxygenSat: vitals.oxygenSat ? Number(vitals.oxygenSat) : null,
              bloodGlucose: vitals.bloodGlucose ? Number(vitals.bloodGlucose) : null,
              weight: vitals.weight ? Number(vitals.weight) : null,
              height: vitals.height ? Number(vitals.height) : null,
              symptoms: serializeSymptoms(vitals.symptoms),
              notes: vitals.notes ? PHIEncryption.encrypt(vitals.notes) : null,
            },
            update: {
              bloodPressure: vitals.bloodPressure || null,
              heartRate: vitals.heartRate ? Number(vitals.heartRate) : null,
              temperature: vitals.temperature ? Number(vitals.temperature) : null,
              oxygenSat: vitals.oxygenSat ? Number(vitals.oxygenSat) : null,
              bloodGlucose: vitals.bloodGlucose ? Number(vitals.bloodGlucose) : null,
              weight: vitals.weight ? Number(vitals.weight) : null,
              height: vitals.height ? Number(vitals.height) : null,
              symptoms: serializeSymptoms(vitals.symptoms),
              notes: vitals.notes ? PHIEncryption.encrypt(vitals.notes) : null,
              recordedAt: new Date(),
            },
          },
        };
      }

      const patient = await prisma.patient.update({
        where: { id: patientId },
        data: patientData,
        include: { vitals: true },
      });

      await HIPAALogger.logAccess(req.user!.userId, "patient", patientId, "WRITE", { action: "revisit" });
      res.json(mapPatientForClient(patient));
    } catch (error) {
      console.error("Revisit patient error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── PATCH /api/patients/:id/status ──────────────────────────────────────────
router.patch(
  "/:id/status",
  requireRole("NURSE", "DOCTOR"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = req.params.id as string;
      const { status } = req.body;
      const validStatuses = ["WAITING", "IN_CONSULT", "CURED", "EMERGENCY"];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({ message: "Invalid status" });
        return;
      }

      const patient = await prisma.patient.update({
        where: { id: patientId },
        data: { status },
        include: { vitals: true },
      });

      await HIPAALogger.logAccess(req.user!.userId, "patient", patientId, "WRITE", { action: "status_change", status });
      res.json(mapPatientForClient(patient));
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── PATCH /api/patients/:id ─────────────────────────────────────────────────
router.patch(
  "/:id",
  requireRole("NURSE"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = req.params.id as string;
      const { name, dob, gender, phone, bloodGroup, emergencyContact, aadhaarNumber, vitals } = req.body;

      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (dob !== undefined) data.dob = dob ? new Date(dob) : null;
      if (gender !== undefined) data.gender = gender;
      if (phone !== undefined) data.phone = phone || null;
      if (bloodGroup !== undefined) data.bloodGroup = bloodGroup || null;
      if (emergencyContact !== undefined) data.emergencyContact = emergencyContact || null;
      if (aadhaarNumber !== undefined) data.aadhaarNumber = aadhaarNumber || null;

      if (vitals !== undefined) {
        const vitalsPayload = {
          bloodPressure: vitals.bloodPressure || null,
          heartRate: vitals.heartRate ? Number(vitals.heartRate) : null,
          temperature: vitals.temperature ? Number(vitals.temperature) : null,
          oxygenSat: vitals.oxygenSat ? Number(vitals.oxygenSat) : null,
          bloodGlucose: vitals.bloodGlucose ? Number(vitals.bloodGlucose) : null,
          weight: vitals.weight ? Number(vitals.weight) : null,
          height: vitals.height ? Number(vitals.height) : null,
          symptoms: serializeSymptoms(vitals.symptoms),
          notes: vitals.notes ? PHIEncryption.encrypt(vitals.notes) : null,
        };
        data.vitals = {
          upsert: {
            create: vitalsPayload,
            update: vitalsPayload,
          },
        };
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({ message: "No fields to update" });
        return;
      }

      const patient = await prisma.patient.update({
        where: { id: patientId },
        data,
        include: { vitals: true },
      });

      await HIPAALogger.logAccess(req.user!.userId, "patient", patientId, "WRITE", { action: "update_demographics" });
      res.json(mapPatientForClient(patient));
    } catch (error) {
      console.error("Update patient error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── GET /api/patients/:id/consults ──────────────────────────────────────────
// HIPAA RBAC: Patient role can only access their own consults
router.get(
  "/:id/consults",
  requireRole("DOCTOR", "PATIENT"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const requestedPatientId = req.params.id as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      let effectivePatientId = requestedPatientId;

      // HIPAA Access Control: patient can only read_own.
      // For patient role, always resolve their linked patient record by Aadhaar,
      // because frontend may pass auth user id instead of patient id.
      if (userRole === "PATIENT") {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { aadhaarNumber: true },
        });

        if (!user?.aadhaarNumber) {
          await HIPAALogger.logAccess(userId, "patient_consults", requestedPatientId, "DENY", {
            reason: "RBAC -patient user missing Aadhaar",
          });
          res.status(403).json({ message: "Forbidden: Unable to resolve your patient record." });
          return;
        }

        const ownPatient = await prisma.patient.findUnique({
          where: { aadhaarNumber: user.aadhaarNumber },
          select: { id: true },
        });

        if (!ownPatient) {
          await HIPAALogger.logAccess(userId, "patient_consults", requestedPatientId, "DENY", {
            reason: "RBAC -no linked patient record",
          });
          res.status(404).json({ message: "No patient record found for this account." });
          return;
        }

        effectivePatientId = ownPatient.id;
      }

      const consults = await prisma.consult.findMany({
        where: { patientId: effectivePatientId },
        orderBy: { createdAt: "desc" },
      });

      // Decrypt PHI fields before sending to client
      const decrypted = consults.map((c) => ({
        ...c,
        transcript: c.transcript ? PHIEncryption.decrypt(c.transcript) : null,
        soapSubjective: c.soapSubjective ? PHIEncryption.decrypt(c.soapSubjective) : null,
        soapObjective: c.soapObjective ? PHIEncryption.decrypt(c.soapObjective) : null,
        soapAssessment: c.soapAssessment ? PHIEncryption.decrypt(c.soapAssessment) : null,
        soapPlan: c.soapPlan ? PHIEncryption.decrypt(c.soapPlan) : null,
        patientSummary: c.patientSummary ? PHIEncryption.decrypt(c.patientSummary) : null,
        icdCodes: normalizeIcdCodesInput(c.icdCodes),
      }));

      await HIPAALogger.logAccess(userId, "patient_consults", effectivePatientId, "READ", {
        requestedPatientId,
      });
      res.json(decrypted);
    } catch (error) {
      console.error("Get patient consults error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
