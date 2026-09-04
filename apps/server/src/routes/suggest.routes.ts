/**
 * suggest.routes.ts -Express routes for the Medical AI Suggestion Pipeline.
 * Ported from docs/main.py lines 1533-1817, adapted to Express.
 *
 * Routes:
 *   POST /suggest          -symptoms → disease panel + session
 *   POST /suggest/confirm  -doctor selects ICD codes → FHIR R4 EMR
 *   GET  /sessions/pending -list sessions awaiting confirmation
 *   GET  /suggest/health   -pipeline health check
 */

import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import {
  runPipeline,
  runDoctorConfirmationAndFhir,
} from "../services/suggest-pipeline.js";
import {
  getPendingSessions,
  getHotClusters,
  getCacheSize,
} from "../services/session-store.js";
import { HIPAALogger } from "../services/hipaa-logger.js";
import { CONFIDENCE_GATE, CHAT_MODEL, VECTOR_STORE_NAME } from "../utils/medical-prompts.js";

const router: Router = Router();

// ── POST /suggest ────────────────────────────────────────────────────────────

router.post("/suggest", async (req: Request, res: Response): Promise<void> => {
  const { symptoms, session_id: reqSessionId } = req.body;

  if (!symptoms || typeof symptoms !== "string" || !symptoms.trim()) {
    res.status(400).json({ message: "Provide a 'symptoms' string." });
    return;
  }

  const sessionId: string = reqSessionId || randomUUID();
  const userId = (req as any).user?.userId ?? "unknown";
  console.log(`[API] /suggest | session=${sessionId} | user=${userId}`);

  try {
    await HIPAALogger.logAccess(userId, "ai_suggest", sessionId, "WRITE", {
      action: "symptom_analysis",
      symptoms_length: symptoms.length,
    });

    const result = await runPipeline(symptoms, sessionId);

    res.json({
      session_id: result.session_id,
      response: result.final_response,
      confidence_score: result.confidence_score,
      confidence_label: result.confidence_label,
      citations: result.citations,
      uncertainty_note: result.uncertainty_note,
      new_knowledge_stored: result.new_knowledge_stored,
      db_write_back: result.db_write_back,
      data_source: result.data_source,
      all_diseases: result.all_diseases,
      awaiting_confirmation: true,
    });
  } catch (err: any) {
    console.error("[API] /suggest error:", err);
    res.status(500).json({ message: err.message || "Pipeline error" });
  }
});

// ── POST /suggest/confirm ────────────────────────────────────────────────────

router.post("/suggest/confirm", async (req: Request, res: Response): Promise<void> => {
  const { session_id, selected_icd_codes, patient_info, vitals } = req.body;

  if (!session_id || !Array.isArray(selected_icd_codes) || !selected_icd_codes.length) {
    res.status(400).json({
      message: "Provide 'session_id' and 'selected_icd_codes' (non-empty array).",
    });
    return;
  }

  const userId = (req as any).user?.userId ?? "unknown";
  console.log(
    `[API] /suggest/confirm | session=${session_id} | selected=${selected_icd_codes.join(",")}`,
  );

  try {
    await HIPAALogger.logAccess(userId, "ai_suggest_confirm", session_id, "WRITE", {
      action: "fhir_emr_generation",
      selected_icd_codes,
    });

    const result = await runDoctorConfirmationAndFhir(
      session_id,
      selected_icd_codes,
      patient_info ?? {},
      vitals ?? {},
    );

    res.json({ success: true, ...result });
  } catch (err: any) {
    if (err.message?.includes("not found") || err.message?.includes("None of")) {
      res.status(422).json({ message: err.message });
      return;
    }
    console.error("[API] /suggest/confirm error:", err);
    res.status(500).json({ message: err.message || "Confirmation error" });
  }
});

// ── GET /sessions/pending ────────────────────────────────────────────────────

router.get("/sessions/pending", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.userId ?? "unknown";
  await HIPAALogger.logAccess(userId, "ai_sessions", null, "READ", {
    context: "list pending sessions",
  });
  res.json({ pending: getPendingSessions() });
});

// ── GET /suggest/health ──────────────────────────────────────────────────────

router.get("/suggest/health", async (_req: Request, res: Response): Promise<void> => {
  res.json({
    status: "ok",
    version: "6.0.0",
    llm: `OpenAI ${CHAT_MODEL}`,
    vector_store: VECTOR_STORE_NAME,
    fhir: "R4",
    hil: "enabled",
    db_write_back: `enabled (confidence < ${CONFIDENCE_GATE})`,
    cache_entries: getCacheSize(),
    pending_sessions: getPendingSessions().length,
    hot_clusters: getHotClusters(5),
  });
});

export default router;
