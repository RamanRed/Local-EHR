import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.middleware.js";
import { PHIEncryption } from "../services/phi-encryption.js";
import { HIPAALogger } from "../services/hipaa-logger.js";

const router: Router = Router();

// ─── POST /api/followup-calls/initiate ──────────────────────────────────────
router.post(
  "/initiate",
  requireRole("DOCTOR", "NURSE"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, consultId } = req.body;

      if (!patientId || !consultId) {
        res.status(400).json({ message: "patientId and consultId are required" });
        return;
      }

      // Validate patient exists
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) {
        res.status(404).json({ message: "Patient not found" });
        return;
      }

      // Validate consult exists and belongs to this patient
      const consult = await prisma.consult.findUnique({ where: { id: consultId } });
      if (!consult || consult.patientId !== patientId) {
        res.status(404).json({ message: "Consult not found for this patient" });
        return;
      }

      // Check for duplicate active call (scheduled or in_progress)
      const existing = await prisma.followUpCall.findFirst({
        where: {
          consultId,
          status: { in: ["scheduled", "in_progress"] },
        },
      });

      if (existing) {
        res.status(409).json({
          message: "An active follow-up call already exists for this consult",
          callId: existing.id,
        });
        return;
      }

      const call = await prisma.followUpCall.create({
        data: {
          patientId,
          consultId,
          initiatedBy: req.user!.userId,
          status: "scheduled",
          scheduledAt: new Date(),
        },
        include: {
          patient: { select: { id: true, name: true } },
        },
      });

      await HIPAALogger.logAccess(req.user!.userId, "followup_call", call.id, "WRITE", {
        action: "initiate",
      });

      res.status(201).json(call);
    } catch (error) {
      console.error("Initiate follow-up call error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── GET /api/followup-calls ────────────────────────────────────────────────
router.get(
  "/",
  requireRole("DOCTOR", "NURSE"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, status, urgencyLevel } = req.query;

      const where: Record<string, unknown> = {};
      if (patientId) where.patientId = patientId as string;
      if (status) where.status = status as string;
      if (urgencyLevel) where.urgencyLevel = urgencyLevel as string;

      const calls = await prisma.followUpCall.findMany({
        where,
        select: {
          id: true,
          patientId: true,
          patient: { select: { id: true, name: true } },
          consultId: true,
          initiatedBy: true,
          status: true,
          urgencyLevel: true,
          scheduledAt: true,
          startedAt: true,
          completedAt: true,
          durationSeconds: true,
          createdAt: true,
          updatedAt: true,
          // Exclude transcript and summary (too large for list view)
          summary: true,
          structuredFindings: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Decrypt summaries for list view
      const decrypted = calls.map((call) => ({
        ...call,
        summary: PHIEncryption.decrypt(call.summary),
      }));

      await HIPAALogger.logAccess(req.user!.userId, "followup_call_list", null, "READ");
      res.json(decrypted);
    } catch (error) {
      console.error("List follow-up calls error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── GET /api/followup-calls/:id ────────────────────────────────────────────
router.get(
  "/:id",
  requireRole("DOCTOR", "NURSE"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const callId = req.params.id as string;
      const call = await prisma.followUpCall.findUnique({
        where: { id: callId },
        include: {
          patient: { select: { id: true, name: true } },
        },
      });

      if (!call) {
        res.status(404).json({ message: "Follow-up call not found" });
        return;
      }

      // Decrypt PHI fields
      const decrypted = {
        ...call,
        transcript: PHIEncryption.decrypt(call.transcript),
        summary: PHIEncryption.decrypt(call.summary),
      };

      await HIPAALogger.logAccess(req.user!.userId, "followup_call", callId, "READ");
      res.json(decrypted);
    } catch (error) {
      console.error("Get follow-up call error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ─── PATCH /api/followup-calls/:id/cancel ───────────────────────────────────
router.patch(
  "/:id/cancel",
  requireRole("DOCTOR", "NURSE"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const callId = req.params.id as string;
      const call = await prisma.followUpCall.findUnique({
        where: { id: callId },
      });

      if (!call) {
        res.status(404).json({ message: "Follow-up call not found" });
        return;
      }

      if (call.status !== "scheduled") {
        res.status(400).json({
          message: `Cannot cancel a call with status "${call.status}". Only scheduled calls can be cancelled.`,
        });
        return;
      }

      const updated = await prisma.followUpCall.update({
        where: { id: callId },
        data: { status: "cancelled" },
        include: {
          patient: { select: { id: true, name: true } },
        },
      });

      await HIPAALogger.logAccess(req.user!.userId, "followup_call", call.id, "WRITE", {
        action: "cancel",
      });

      res.json(updated);
    } catch (error) {
      console.error("Cancel follow-up call error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
