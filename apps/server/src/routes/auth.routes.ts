import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const router: Router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// In-memory OTP store: aadhaarNumber -> { otp, expiresAt }
const otpStore = new Map<string, { otp: string; expiresAt: number }>();
// Track Aadhaar numbers that have been OTP-verified (for onboarding guard)
const verifiedAadhaarSet = new Set<string>();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// GET /api/auth/me
router.get("/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, role: true, phone: true, email: true, specialization: true, photoUrl: true, dob: true, gender: true, bloodGroup: true, emergencyContact: true },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({ user });
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
});

// PATCH /api/auth/profile
router.patch("/profile", async (req: Request, res: Response): Promise<void> => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };

    const { name, phone, email, specialization, photoUrl, dob, gender, bloodGroup, emergencyContact } = req.body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (photoUrl !== undefined) data.photoUrl = photoUrl;
    // Only DOCTOR can set specialization
    if (specialization !== undefined && decoded.role === "DOCTOR") {
      data.specialization = specialization;
    }
    // Patient-specific fields (allow for any role since nurses may set these during onboarding)
    if (dob !== undefined) data.dob = dob ? new Date(dob) : null;
    if (gender !== undefined) data.gender = gender;
    if (bloodGroup !== undefined) data.bloodGroup = bloodGroup;
    if (emergencyContact !== undefined) data.emergencyContact = emergencyContact;

    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data,
      select: { id: true, name: true, role: true, phone: true, email: true, specialization: true, photoUrl: true, dob: true, gender: true, bloodGroup: true, emergencyContact: true },
    });

    res.json({ user });
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
});

// POST /api/auth/aadhaar/send-otp
router.post("/aadhaar/send-otp", async (req: Request, res: Response): Promise<void> => {
  try {
    const { aadhaarNumber } = req.body;

    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      res.status(400).json({ message: "Valid 12-digit Aadhaar number is required" });
      return;
    }

    // Hardcoded OTP for demo — replace with real SMS provider before go-live
    const otp = "123456";

    // Store OTP in memory with expiry
    otpStore.set(aadhaarNumber, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS });

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/auth/aadhaar/verify-otp
router.post("/aadhaar/verify-otp", async (req: Request, res: Response): Promise<void> => {
  try {
    const { aadhaarNumber, otp } = req.body;

    if (!aadhaarNumber || !otp) {
      res.status(400).json({ message: "Aadhaar number and OTP are required" });
      return;
    }

    const stored = otpStore.get(aadhaarNumber);
    if (!stored) {
      res.status(400).json({ message: "No OTP was requested for this Aadhaar number" });
      return;
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(aadhaarNumber);
      res.status(400).json({ message: "OTP has expired. Please request a new one" });
      return;
    }

    if (stored.otp !== otp) {
      res.status(400).json({ message: "Invalid OTP" });
      return;
    }

    // OTP verified -clear it
    otpStore.delete(aadhaarNumber);

    const user = await prisma.user.findUnique({ where: { aadhaarNumber } });

    if (!user) {
      // New user -mark as verified so onboard endpoint can proceed
      verifiedAadhaarSet.add(aadhaarNumber);
      res.json({ needsOnboarding: true, aadhaarNumber });
      return;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role, phone: user.phone, email: user.email, specialization: user.specialization, photoUrl: user.photoUrl, dob: user.dob, gender: user.gender, bloodGroup: user.bloodGroup, emergencyContact: user.emergencyContact },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/auth/aadhaar/onboard
router.post("/aadhaar/onboard", async (req: Request, res: Response): Promise<void> => {
  try {
    const { aadhaarNumber, name, dob, gender, bloodGroup, emergencyContact } = req.body;

    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      res.status(400).json({ message: "Valid 12-digit Aadhaar number is required" });
      return;
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ message: "Name is required" });
      return;
    }

    // Only allow onboarding for OTP-verified Aadhaar numbers
    if (!verifiedAadhaarSet.has(aadhaarNumber)) {
      res.status(403).json({ message: "Aadhaar number has not been verified. Please verify OTP first." });
      return;
    }

    // Race condition guard: check if user was created between verify and onboard
    const existing = await prisma.user.findUnique({ where: { aadhaarNumber } });
    if (existing) {
      verifiedAadhaarSet.delete(aadhaarNumber);
      res.status(409).json({ message: "Account already exists for this Aadhaar number" });
      return;
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        aadhaarNumber,
        role: "PATIENT",
        dob: dob ? new Date(dob) : null,
        gender: gender || null,
        bloodGroup: bloodGroup || null,
        emergencyContact: emergencyContact || null,
      },
    });

    // Clear the verified flag
    verifiedAadhaarSet.delete(aadhaarNumber);

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role, phone: user.phone, email: user.email, specialization: user.specialization, photoUrl: user.photoUrl, dob: user.dob, gender: user.gender, bloodGroup: user.bloodGroup, emergencyContact: user.emergencyContact },
    });
  } catch (error) {
    console.error("Onboard error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
