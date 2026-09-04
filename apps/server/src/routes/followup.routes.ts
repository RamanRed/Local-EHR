import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.middleware.js";

const router: Router = Router();

// GET /api/follow-ups
// Lists follow-ups
router.get(
    "/",
    requireRole("DOCTOR", "NURSE"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            // If doctor, optionally filter by doctorId (or show all for nurse/clinic)
            const { doctorId } = req.query;
            const whereClause: any = {};

            if (req.user!.role === "DOCTOR") {
                whereClause.doctorId = req.user!.userId;
            } else if (doctorId) {
                whereClause.doctorId = String(doctorId);
            }

            const followUps = await prisma.followUp.findMany({
                where: whereClause,
                include: {
                    patient: { select: { id: true, name: true, phone: true, status: true } },
                },
                orderBy: { followUpDate: "asc" },
            });
            res.json(followUps);
        } catch (error) {
            console.error("List follow-ups error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

// GET /api/follow-ups/patient/:patientId
// Get follow up history for a specific patient
router.get(
    "/patient/:patientId",
    requireRole("DOCTOR", "NURSE"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const followUps = await prisma.followUp.findMany({
                where: { patientId: req.params.patientId as string },
                include: {
                    fulfillingConsults: {
                        select: { id: true, createdAt: true, patientSummary: true, prescription: true, progressNote: true }
                    }
                },
                orderBy: { followUpDate: "asc" },
            });
            res.json(followUps);
        } catch (error) {
            console.error("Patient follow-ups error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

// GET /api/follow-ups/:id
// Get a specific follow-up by ID
router.get(
    "/:id",
    requireRole("DOCTOR", "NURSE"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const followUp = await prisma.followUp.findUnique({
                where: { id: req.params.id as string },
                include: {
                    patient: true,
                    fulfillingConsults: {
                        select: { id: true, createdAt: true, patientSummary: true, prescription: true, progressNote: true }
                    }
                }
            });
            if (!followUp) {
                res.status(404).json({ message: "Follow-up not found" });
                return;
            }
            res.json(followUp);
        } catch (error) {
            console.error("Get follow-up error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

// PATCH /api/follow-ups/:id/status
// Explicitly mark a follow up as CANCELLED or COMPLETED
router.patch(
    "/:id/status",
    requireRole("DOCTOR", "NURSE"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { status } = req.body;
            const followUp = await prisma.followUp.update({
                where: { id: req.params.id as string },
                data: { status },
            });
            res.json(followUp);
        } catch (error) {
            console.error("Update follow-up status error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

export default router;
