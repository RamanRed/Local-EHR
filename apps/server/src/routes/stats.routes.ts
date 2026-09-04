import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.middleware.js";

const router: Router = Router();

// GET /api/stats/nurse
router.get(
  "/nurse",
  requireRole("NURSE"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startOfToday = new Date(today);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      const [totalPatients, waiting, emergency, completedToday, underTreatment, todayFollowUps, upcomingFollowUps] =
        await Promise.all([
          prisma.patient.count(),
          prisma.patient.count({ where: { status: "WAITING" } }),
          prisma.patient.count({ where: { status: "EMERGENCY" } }),
          prisma.patient.count({
            where: { status: { in: ["UNDER_TREATMENT", "CURED"] }, updatedAt: { gte: today } },
          }),
          prisma.patient.count({ where: { status: "UNDER_TREATMENT" } }),
          prisma.followUp.count({
            where: {
              followUpDate: {
                gte: startOfToday,
                lte: endOfToday,
              },
              status: "PENDING",
            },
          }),
          prisma.followUp.count({
            where: {
              followUpDate: {
                gt: endOfToday,
              },
              status: "PENDING",
            },
          }),
        ]);

      res.json({ totalPatients, waiting, emergency, completedToday, underTreatment, todayFollowUps, upcomingFollowUps });
    } catch (error) {
      console.error("Nurse stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /api/stats/doctor
router.get(
  "/doctor",
  requireRole("DOCTOR"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startOfToday = new Date(today);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      const [waiting, inConsult, completedToday, underTreatment, todayFollowUps, upcomingFollowUps] = await Promise.all([
        prisma.patient.count({
          where: { status: { in: ["WAITING", "EMERGENCY"] } },
        }),
        prisma.patient.count({ where: { status: "IN_CONSULT" } }),
        prisma.patient.count({
          where: { status: { in: ["UNDER_TREATMENT", "CURED"] }, updatedAt: { gte: today } },
        }),
        prisma.patient.count({ where: { status: "UNDER_TREATMENT" } }),
        prisma.followUp.count({
          where: {
            followUpDate: {
              gte: startOfToday,
              lte: endOfToday,
            },
            status: "PENDING",
            doctorId: req.user!.userId,
          },
        }),
        prisma.followUp.count({
          where: {
            followUpDate: {
              gt: endOfToday,
            },
            status: "PENDING",
            doctorId: req.user!.userId,
          },
        }),
      ]);

      res.json({ waiting, inConsult, completedToday, underTreatment, todayFollowUps, upcomingFollowUps });
    } catch (error) {
      console.error("Doctor stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /api/stats/patient
router.get(
  "/patient",
  requireRole("PATIENT"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { aadhaarNumber: true },
      });

      if (!user?.aadhaarNumber) {
        res.status(403).json({ message: "Forbidden: Unable to resolve patient profile" });
        return;
      }

      const [totalVisits, upcomingFollowUps] = await Promise.all([
        prisma.consult.count({
          where: {
            finalized: true,
            patient: { aadhaarNumber: user.aadhaarNumber },
          },
        }),
        prisma.consult.count({
          where: {
            followUpDate: { gt: new Date() },
            finalized: true,
            patient: { aadhaarNumber: user.aadhaarNumber },
          },
        }),
      ]);

      res.json({ totalVisits, upcomingFollowUps });
    } catch (error) {
      console.error("Patient stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
