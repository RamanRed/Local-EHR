import { Router, Request, Response } from "express";
import type { IRouter } from "express";
import { prisma } from "../lib/prisma.js";
import { FHIRMapper } from "../utils/fhir-mapper.js";
import { HIPAALogger } from "../services/hipaa-logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router: IRouter = Router();

// In a real system you'd also want to verify the client requesting FHIR data
// has appropriate scopes (e.g., patient/*.read). 
// Here we use the standard authMiddleware to ensure they are logged in.

router.get("/Patient/:id", authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id as string;
        const patientId = req.params.id as string;

        // Fetch patient
        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
        });

        if (!patient) {
            await HIPAALogger.logAccess(userId, "patient", patientId || null, "DENY", { reason: "Not found" });
            res.status(404).json({ error: "Patient not found" });
            return;
        }

        // Log HIPAA compliance READ action
        await HIPAALogger.logAccess(userId, "patient", patientId, "READ", { context: "FHIR API" });

        // Note: In an integrated setup we would decrypt patient.aadhaarNumber here
        // using PHIEncryption.decrypt(patient.aadhaarNumber) before passing to FHIRMapper.

        const fhirPatient = FHIRMapper.toPatient(patient);
        res.json(fhirPatient);
    } catch (error) {
        console.error("Error in FHIR Patient GET:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/Observation", authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id as string;
        const patientId = req.query.subject as string;

        if (!patientId || !patientId.startsWith("Patient/")) {
            res.status(400).json({ error: "Missing or invalid subject query parameter (e.g., ?subject=Patient/123)" });
            return;
        }

        const rawPatientId = patientId.replace("Patient/", "");

        const vitalsList = await prisma.vitals.findMany({
            where: { patientId: rawPatientId },
        });

        // Log HIPAA compliance
        await HIPAALogger.logAccess(userId, "vitals", rawPatientId, "READ", { context: "FHIR API Observation Search" });

        const fhirObservations = vitalsList.map((v) => FHIRMapper.toObservation(v));

        res.json({
            resourceType: "Bundle",
            type: "searchset",
            total: fhirObservations.length,
            entry: fhirObservations.map((obs) => ({
                fullUrl: `http://localhost:3001/api/fhir/Observation/${obs.id}`,
                resource: obs,
            })),
        });
    } catch (error) {
        console.error("Error in FHIR Observation Search:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
