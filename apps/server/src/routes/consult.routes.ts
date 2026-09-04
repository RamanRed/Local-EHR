import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.middleware.js";
import { PHIEncryption } from "../services/phi-encryption.js";
import { HIPAALogger } from "../services/hipaa-logger.js";

const router: Router = Router();

// Simple per-key lock to serialize concurrent consult creation for the same patient+doctor
const pendingCreates = new Map<string, Promise<unknown>>();

type IcdCode = { code: string; description: string };

function normalizeIcdCodesInput(icdCodes: unknown): IcdCode[] {
  if (Array.isArray(icdCodes)) {
    return icdCodes
      .filter((c): c is IcdCode => {
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
    if (Array.isArray(parsed)) {
      return normalizeIcdCodesInput(parsed);
    }
  } catch {
    // Ignore parse errors and return empty.
  }

  return [];
}

function serializeIcdCodes(icdCodes: unknown): string | null {
  const normalized = normalizeIcdCodesInput(icdCodes);
  return normalized.length ? JSON.stringify(normalized) : null;
}

function normalizeSymptomsText(symptoms: unknown): string | null {
  if (typeof symptoms === "string") {
    const cleaned = symptoms.trim();
    if (!cleaned) return null;

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        const list = parsed
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim())
          .filter(Boolean);
        return list.length ? list.join(", ") : null;
      }
    } catch {
      // Keep original string.
    }

    return cleaned;
  }

  if (Array.isArray(symptoms)) {
    const list = symptoms
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list.join(", ") : null;
  }

  return null;
}

// ─── Generate a rolling patient consultation summary ────────────────────────
async function generateConsultSummary(
  soapSubjective: string | null,
  soapAssessment: string | null,
  soapPlan: string | null,
  icdCodes: any,
  prescription: string | null,
  symptoms: string | null,
  existingSummary: string | null,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || 'ollama';
  if (!apiKey) return null;

  const icdText = Array.isArray(icdCodes)
    ? icdCodes.map((c: any) => `${c.description} (${c.code})`).join(", ")
    : "";

  const prompt = `You are a medical records assistant. Generate a concise rolling patient summary that captures ONLY the most important clinical points for future consultations.

${existingSummary ? `PREVIOUS SUMMARY:\n${existingSummary}\n` : ""}
CURRENT CONSULTATION:
${soapSubjective ? `- Chief Complaint: ${soapSubjective}` : ""}
${soapAssessment ? `- Assessment: ${soapAssessment}` : ""}
${soapPlan ? `- Plan: ${soapPlan}` : ""}
${icdText ? `- Diagnoses: ${icdText}` : ""}
${prescription ? `- Prescription: ${prescription}` : ""}
${symptoms ? `- Symptoms: ${symptoms}` : ""}

INSTRUCTIONS:
- Merge the previous summary (if any) with the current consultation into ONE concise summary.
- Keep ONLY important clinical points: key diagnoses, ongoing conditions, allergies, significant medications, treatment outcomes, and unresolved issues.
- Remove resolved/outdated information that is no longer clinically relevant.
- Maximum 200 words. Use bullet points.
- Do NOT include dates, doctor names, or administrative details.
- Return ONLY the summary text, no JSON, no markdown fences.`;

  try {    if (apiKey === 'ollama') {
        const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const ollamaModel = process.env.OLLAMA_MODEL || 'llama3';
        const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ model: ollamaModel, prompt, stream: false })
        });
        if (!response.ok) throw new Error("Failed to contact Ollama");
        const json = await response.json();
        return json.response?.trim() || null;
    }
    const ai = new GoogleGenAI({ apiKey });
    const models = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text?.trim() || null;
      } catch (err: any) {
        if (err?.status === 429) continue;
        throw err;
      }
    }
  } catch (err) {
    console.error("Failed to generate consult summary:", err);
  }
  return null;
}

// ─── GET /api/consults ───────────────────────────────────────────────────────
router.get(
  "/",
  requireRole("DOCTOR"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const consults = await prisma.consult.findMany({
        where: { doctorId: req.user!.userId },
        include: { patient: { select: { id: true, name: true } } },
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
        symptoms: normalizeSymptomsText(c.symptoms),
      }));

      await HIPAALogger.logAccess(req.user!.userId, "consult_list", null, "READ");
      res.json(decrypted);
    } catch (error) {
      console.error("List consults error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── POST /api/consults ──────────────────────────────────────────────────────
router.post(
  "/",
  requireRole("DOCTOR"),
  async (req: Request, res: Response): Promise<void> => {
    const { patientId, transcript, isFollowUp, fulfilledFollowUpId } = req.body;

    if (!patientId) {
      res.status(400).json({ message: "patientId is required" });
      return;
    }

    const lockKey = `${patientId}:${req.user!.userId}`;

    const prev = pendingCreates.get(lockKey) ?? Promise.resolve();
    const current = prev.then(async () => {
      try {
        const existing = await prisma.consult.findFirst({
          where: {
            patientId,
            doctorId: req.user!.userId,
            finalized: false,
          },
          orderBy: { createdAt: "desc" },
        });

        if (existing) {
          await HIPAALogger.logAccess(req.user!.userId, "consult", existing.id, "READ", { context: "resume" });
          // Ensure patient status is IN_CONSULT when resuming
          await prisma.patient.update({
            where: { id: patientId },
            data: { status: "IN_CONSULT" },
          });
          res.json(existing);
          return;
        }

        await prisma.patient.update({
          where: { id: patientId },
          data: { status: "IN_CONSULT" },
        });

        // Encrypt transcript (clinical notes are PHI)
        const consult = await prisma.consult.create({
          data: {
            patientId,
            doctorId: req.user!.userId,
            transcript: transcript ? PHIEncryption.encrypt(transcript) : null,
            isFollowUp: isFollowUp || false,
            fulfilledFollowUpId: fulfilledFollowUpId || null,
          },
        });

        await HIPAALogger.logAccess(req.user!.userId, "consult", consult.id, "WRITE", { action: "create" });
        res.status(201).json(consult);
      } catch (error) {
        console.error("Create consult error:", error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Internal server error" });
        }
      }
    });

    pendingCreates.set(lockKey, current.finally(() => {
      if (pendingCreates.get(lockKey) === current) {
        pendingCreates.delete(lockKey);
      }
    }));
  }
);

// ─── GET /api/consults/:id ───────────────────────────────────────────────────
// HIPAA RBAC: Patient role can only access their own consults
router.get(
  "/:id",
  requireRole("DOCTOR", "PATIENT"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const consultId = req.params.id as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const consult = await prisma.consult.findUnique({
        where: { id: consultId },
      });

      if (!consult) {
        await HIPAALogger.logAccess(userId, "consult", consultId, "DENY", { reason: "Not found" });
        res.status(404).json({ message: "Consult not found" });
        return;
      }

      // HIPAA Access Control: patient can only read_own
      if (userRole === "PATIENT") {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const linkedPatient = await prisma.patient.findUnique({ where: { id: consult.patientId } });

        if (!user || !linkedPatient || user.aadhaarNumber !== linkedPatient.aadhaarNumber) {
          await HIPAALogger.logAccess(userId, "consult", consultId, "DENY", { reason: "RBAC -not own record" });
          res.status(403).json({ message: "Forbidden: You can only access your own records." });
          return;
        }
      }

      await HIPAALogger.logAccess(userId, "consult", consultId, "READ");
      res.json({
        ...consult,
        icdCodes: normalizeIcdCodesInput(consult.icdCodes),
        symptoms: normalizeSymptomsText(consult.symptoms),
      });
    } catch (error) {
      console.error("Get consult error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── PATCH /api/consults/:id ─────────────────────────────────────────────────
router.patch(
  "/:id",
  requireRole("DOCTOR"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const consultId = req.params.id as string;
      const {
        transcript,
        soapSubjective,
        soapObjective,
        soapAssessment,
        soapPlan,
        icdCodes,
        patientSummary,
        followUpDate,
        finalized,
        progressNote,
        prescription,
        symptoms,
      } = req.body;

      const data: Record<string, unknown> = {};
      const normalizedIcdCodes = icdCodes !== undefined ? normalizeIcdCodesInput(icdCodes) : undefined;
      const normalizedSymptoms = symptoms !== undefined ? normalizeSymptomsText(symptoms) : undefined;

      // Encrypt all clinical narrative fields (HIPAA PHI at rest)
      if (transcript !== undefined) data.transcript = transcript ? PHIEncryption.encrypt(transcript) : null;
      if (soapSubjective !== undefined) data.soapSubjective = soapSubjective ? PHIEncryption.encrypt(soapSubjective) : null;
      if (soapObjective !== undefined) data.soapObjective = soapObjective ? PHIEncryption.encrypt(soapObjective) : null;
      if (soapAssessment !== undefined) data.soapAssessment = soapAssessment ? PHIEncryption.encrypt(soapAssessment) : null;
      if (soapPlan !== undefined) data.soapPlan = soapPlan ? PHIEncryption.encrypt(soapPlan) : null;
      if (patientSummary !== undefined) data.patientSummary = patientSummary ? PHIEncryption.encrypt(patientSummary) : null;

      // Non-PHI structured data stays plain for FHIR querying
      if (icdCodes !== undefined) data.icdCodes = serializeIcdCodes(icdCodes);
      if (followUpDate !== undefined) data.followUpDate = followUpDate ? new Date(followUpDate) : null;
      if (finalized !== undefined) data.finalized = finalized;
      if (progressNote !== undefined) data.progressNote = progressNote;
      if (prescription !== undefined) data.prescription = prescription;
      if (symptoms !== undefined) data.symptoms = normalizedSymptoms;

      const consult = await prisma.consult.update({
        where: { id: consultId },
        data,
      });

      await HIPAALogger.logAccess(req.user!.userId, "consult", consultId, "WRITE", { action: "update" });

      // If finalized, handle patient status, summary generation, and FollowUp spawns/completions
      if (finalized) {
        // Fetch the patient's existing summary for merging
        const patientRecord = await prisma.patient.findUnique({
          where: { id: consult.patientId },
          select: { consultSummary: true },
        });

        const existingSummary = patientRecord?.consultSummary
          ? PHIEncryption.decrypt(patientRecord.consultSummary)
          : null;

        // Decrypt the SOAP fields we just saved for the summary generator
        const decryptedSubjective = soapSubjective ? soapSubjective : (consult.soapSubjective ? PHIEncryption.decrypt(consult.soapSubjective) : null);
        const decryptedAssessment = soapAssessment ? soapAssessment : (consult.soapAssessment ? PHIEncryption.decrypt(consult.soapAssessment) : null);
        const decryptedPlan = soapPlan ? soapPlan : (consult.soapPlan ? PHIEncryption.decrypt(consult.soapPlan) : null);
        const icdForSummary = icdCodes !== undefined
          ? (normalizedIcdCodes ?? [])
          : normalizeIcdCodesInput(consult.icdCodes);
        const symptomsForSummary = symptoms !== undefined
          ? normalizedSymptoms
          : normalizeSymptomsText(consult.symptoms);

        // Generate an updated rolling summary (non-blocking — don't fail finalization if this errors)
        generateConsultSummary(
          decryptedSubjective,
          decryptedAssessment,
          decryptedPlan,
          icdForSummary,
          prescription || consult.prescription,
          symptomsForSummary,
          existingSummary,
        ).then(async (summary) => {
          if (summary) {
            await prisma.patient.update({
              where: { id: consult.patientId },
              data: { consultSummary: PHIEncryption.encrypt(summary) },
            });
          }
        }).catch((err) => {
          console.error("Non-blocking summary generation failed:", err);
        });

        await prisma.patient.update({
          where: { id: consult.patientId },
          data: { status: followUpDate ? "UNDER_TREATMENT" : "CURED" },
        });

        // Automatically spawn a new FollowUp if a date was strictly scheduled
        if (followUpDate) {
          await prisma.followUp.create({
            data: {
              patientId: consult.patientId,
              doctorId: consult.doctorId,
              baseConsultId: consult.id,
              followUpDate: new Date(followUpDate),
              status: "PENDING",
            }
          });
        }

        // If this consult was inherently a follow-up satisfying an older ticket, mark it completed
        if (consult.fulfilledFollowUpId) {
          await prisma.followUp.update({
            where: { id: consult.fulfilledFollowUpId },
            data: { status: "COMPLETED" },
          });
        }
      }

      res.json({
        ...consult,
        icdCodes: normalizeIcdCodesInput(consult.icdCodes),
        symptoms: normalizeSymptomsText(consult.symptoms),
      });
    } catch (error) {
      console.error("Update consult error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
