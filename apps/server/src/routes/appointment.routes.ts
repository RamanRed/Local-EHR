import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.middleware.js";

const router: Router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// POST /api/appointments -create appointment (PATIENT)
router.post(
  "/",
  requireRole("PATIENT"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, type, reason, symptoms, preferredDate, timeSlot, mobile, doctorId, doctorName } = req.body;

      if (!type || !preferredDate || !timeSlot || !mobile) {
        res.status(400).json({ message: "type, preferredDate, timeSlot, and mobile are required" });
        return;
      }

      // Resolve the Patient record: use provided patientId, or find/create from logged-in user
      let resolvedPatientId = patientId;

      if (!resolvedPatientId) {
        const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
        if (!user) {
          res.status(404).json({ message: "User not found" });
          return;
        }

        // Try to find existing patient by aadhaar
        let patient = user.aadhaarNumber
          ? await prisma.patient.findUnique({ where: { aadhaarNumber: user.aadhaarNumber } })
          : null;

        // Auto-create patient record if none exists
        if (!patient) {
          patient = await prisma.patient.create({
            data: {
              name: user.name,
              aadhaarNumber: user.aadhaarNumber,
              gender: user.gender || "Unknown",
              phone: user.phone || mobile,
              dob: user.dob,
              bloodGroup: user.bloodGroup,
              emergencyContact: user.emergencyContact,
              createdBy: user.id,
            },
          });
        }

        resolvedPatientId = patient.id;
      } else {
        // Check if it's a Patient record ID
        const existingPatient = await prisma.patient.findUnique({ where: { id: resolvedPatientId }, select: { id: true } });
        if (!existingPatient) {
          // Not a Patient ID -check if it's a User ID and resolve/create Patient from it
          const user = await prisma.user.findUnique({ where: { id: resolvedPatientId } });
          if (!user) {
            res.status(400).json({ message: "Invalid patientId -no patient or user found with this ID" });
            return;
          }

          // Find existing patient by aadhaar, or create one
          let patient = user.aadhaarNumber
            ? await prisma.patient.findUnique({ where: { aadhaarNumber: user.aadhaarNumber } })
            : null;

          if (!patient) {
            patient = await prisma.patient.create({
              data: {
                name: user.name,
                aadhaarNumber: user.aadhaarNumber,
                gender: user.gender || "Unknown",
                phone: user.phone || mobile,
                dob: user.dob,
                bloodGroup: user.bloodGroup,
                emergencyContact: user.emergencyContact,
                createdBy: user.id,
              },
            });
          }

          resolvedPatientId = patient.id;
        }
      }

      let roomId: string | null = null;
      let videoLink: string | null = null;

      if (type === "videoConsultation") {
        roomId = crypto.randomUUID();
        videoLink = `${FRONTEND_URL}/video-room/${roomId}`;
      }

      const appointment = await prisma.appointment.create({
        data: {
          patientId: resolvedPatientId,
          type,
          reason: reason || null,
          symptoms: symptoms || null,
          preferredDate: new Date(preferredDate),
          timeSlot,
          mobile,
          doctorId: doctorId || null,
          doctorName: doctorName || null,
          roomId,
          videoLink,
        },
        include: { patient: { select: { id: true, name: true } } },
      });

      res.status(201).json(appointment);
    } catch (error) {
      console.error("Create appointment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /api/appointments -list all appointments (DOCTOR)
router.get(
  "/",
  requireRole("DOCTOR"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, date } = req.query;

      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (date) {
        const d = new Date(date as string);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        where.preferredDate = { gte: d, lt: nextDay };
      }

      const appointments = await prisma.appointment.findMany({
        where,
        include: { patient: { select: { id: true, name: true } } },
        orderBy: { preferredDate: "asc" },
      });

      res.json(appointments);
    } catch (error) {
      console.error("List appointments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /api/appointments/my -list patient's own appointments (PATIENT)
router.get(
  "/my",
  requireRole("PATIENT"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Find patient records linked to this user (by aadhaar match or createdBy)
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const patients = await prisma.patient.findMany({
        where: user.aadhaarNumber
          ? { aadhaarNumber: user.aadhaarNumber }
          : { createdBy: user.id },
        select: { id: true },
      });

      const patientIds = patients.map((p) => p.id);

      const appointments = await prisma.appointment.findMany({
        where: { patientId: { in: patientIds } },
        include: { patient: { select: { id: true, name: true } } },
        orderBy: { preferredDate: "desc" },
      });

      res.json(appointments);
    } catch (error) {
      console.error("List my appointments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /api/appointments/:id -get single appointment (DOCTOR, PATIENT)
router.get(
  "/:id",
  requireRole("DOCTOR", "PATIENT"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: req.params.id as string },
        include: { patient: { select: { id: true, name: true } } },
      });

      if (!appointment) {
        res.status(404).json({ message: "Appointment not found" });
        return;
      }

      res.json(appointment);
    } catch (error) {
      console.error("Get appointment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// PATCH /api/appointments/:id -update appointment (DOCTOR)
router.patch(
  "/:id",
  requireRole("DOCTOR"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, doctorId, doctorName } = req.body;

      const data: Record<string, unknown> = {};
      if (status) data.status = status;
      if (doctorId !== undefined) data.doctorId = doctorId;
      if (doctorName !== undefined) data.doctorName = doctorName;

      const appointment = await prisma.appointment.update({
        where: { id: req.params.id as string },
        data,
        include: { patient: { select: { id: true, name: true } } },
      });

      res.json(appointment);
    } catch (error) {
      console.error("Update appointment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// PATCH /api/appointments/:id/status -quick status update (DOCTOR, PATIENT)
router.patch(
  "/:id/status",
  requireRole("DOCTOR", "PATIENT"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ message: "status is required" });
        return;
      }

      const appointment = await prisma.appointment.update({
        where: { id: req.params.id as string },
        data: { status },
        include: { patient: { select: { id: true, name: true } } },
      });

      res.json(appointment);
    } catch (error) {
      console.error("Update appointment status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
