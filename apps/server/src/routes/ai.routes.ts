import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { execFile } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

const router: Router = Router();

// ── Fallback: Symptom → ICD-10 keyword map ──
const symptomIcdMap: Record<string, { code: string; description: string }[]> = {
  headache: [{ code: "R51", description: "Headache" }],
  "chest pain": [
    { code: "R07.9", description: "Chest pain, unspecified" },
    { code: "I20.9", description: "Angina pectoris, unspecified" },
  ],
  fever: [{ code: "R50.9", description: "Fever, unspecified" }],
  cough: [{ code: "R05", description: "Cough" }],
  "sore throat": [{ code: "J02.9", description: "Acute pharyngitis, unspecified" }],
  nausea: [{ code: "R11.0", description: "Nausea" }],
  vomiting: [{ code: "R11.1", description: "Vomiting" }],
  dizziness: [{ code: "R42", description: "Dizziness and giddiness" }],
  fatigue: [{ code: "R53.83", description: "Other fatigue" }],
  "abdominal pain": [{ code: "R10.9", description: "Unspecified abdominal pain" }],
  "back pain": [{ code: "M54.5", description: "Low back pain" }],
  "shortness of breath": [{ code: "R06.02", description: "Shortness of breath" }],
  "runny nose": [{ code: "J00", description: "Acute nasopharyngitis (common cold)" }],
  "loss of appetite": [{ code: "R63.0", description: "Anorexia" }],
  "knee pain": [{ code: "M25.569", description: "Pain in unspecified knee" }],
  sweating: [{ code: "R61", description: "Generalized hyperhidrosis" }],
  stiffness: [{ code: "M25.60", description: "Stiffness of unspecified joint" }],
};

function matchIcdCodes(symptoms: string[]): { code: string; description: string }[] {
  const matched = new Map<string, { code: string; description: string }>();
  for (const symptom of symptoms) {
    const key = symptom.toLowerCase().trim();
    for (const [term, codes] of Object.entries(symptomIcdMap)) {
      if (key.includes(term) || term.includes(key)) {
        for (const c of codes) matched.set(c.code, c);
      }
    }
  }
  return Array.from(matched.values());
}

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

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned || undefined;
}

function buildFallbackResponse(
  transcript: string | undefined,
  symptoms: string[] | undefined,
  vitals: Record<string, unknown> | undefined,
) {
  const allSymptoms: string[] = symptoms ? [...symptoms] : [];
  if (transcript) {
    const lower = transcript.toLowerCase();
    for (const term of Object.keys(symptomIcdMap)) {
      if (lower.includes(term) && !allSymptoms.some((s) => s.toLowerCase().includes(term))) {
        allSymptoms.push(term.charAt(0).toUpperCase() + term.slice(1));
      }
    }
  }

  const icdSuggestions = matchIcdCodes(allSymptoms);

  const subjective = transcript
    ? `Patient reports: ${allSymptoms.join(", ") || "symptoms as described"}. ${transcript}`
    : `Patient presents with: ${allSymptoms.join(", ")}.`;

  const objectiveParts: string[] = [];
  if (vitals) {
    if (vitals.bloodPressure) objectiveParts.push(`BP ${vitals.bloodPressure}`);
    if (vitals.heartRate) objectiveParts.push(`HR ${vitals.heartRate} bpm`);
    if (vitals.temperature) objectiveParts.push(`Temp ${vitals.temperature}°F`);
    if (vitals.oxygenSat) objectiveParts.push(`SpO2 ${vitals.oxygenSat}%`);
    if (vitals.bloodGlucose) objectiveParts.push(`Blood Glucose ${vitals.bloodGlucose} mg/dL`);
  }
  const objective = objectiveParts.length > 0
    ? `Vitals: ${objectiveParts.join(", ")}. Physical examination findings pending.`
    : "Physical examination and vitals assessment pending.";

  const assessment = icdSuggestions.length > 0
    ? `Differential diagnoses include: ${icdSuggestions.map((c) => `${c.description} (${c.code})`).join("; ")}. Further evaluation recommended.`
    : "Assessment pending further clinical evaluation and diagnostic workup.";

  const plan = "1. Complete physical examination\n2. Order relevant investigations as indicated\n3. Initiate symptomatic treatment\n4. Follow up as clinically appropriate";

  return { cleanedSymptoms: allSymptoms, soap: { subjective, objective, assessment, plan }, icdSuggestions };
}

// ─── Ollama helper ────────────────────────────────────────────────────────────

async function ollamaGenerate(prompt: string): Promise<string> {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const ollamaModel   = process.env.OLLAMA_MODEL   || "mistral:latest";

  const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ model: ollamaModel, prompt, stream: false }),
  });

  if (!response.ok) {
    throw new Error(`Ollama generate failed: ${response.status} ${await response.text()}`);
  }

  const json: any = await response.json();
  return json.response?.trim() ?? "";
}

function getAudioExtensionFromMimeType(mimeType: unknown): string {
  if (typeof mimeType !== "string") return "webm";

  const normalized = mimeType.toLowerCase();
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("webm")) return "webm";

  return "webm";
}

function extractTextFromPythonOutput(stdout: string): string {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (parsed && typeof parsed.text === "string") {
        return parsed.text.trim();
      }
    } catch {
      // Ignore non-JSON lines.
    }
  }

  return "";
}

async function runTranscribeScript(
  pythonExecutable: string,
  scriptPath: string,
  inputPath: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    execFile(
      pythonExecutable,
      [scriptPath, inputPath],
      {
        env:       { ...process.env },
        maxBuffer: 1024 * 1024 * 10,
        timeout:   180_000, // 3 min — model load can be slow
      },
      (err, stdout, stderr) => {
        const parsedText = extractTextFromPythonOutput(stdout ?? "");

        if (parsedText) {
          resolve(parsedText);
          return;
        }

        if (!err) {
          resolve("");
          return;
        }

        const stderrText = (stderr ?? "").trim();
        const reason = stderrText || err.message || "Unknown Python execution error";
        reject(new Error(`${pythonExecutable}: ${reason}`));
      },
    );
  });
}

async function transcribeWithPythonFallbacks(inputPath: string): Promise<string> {
  const pythonScriptPath = join(__dirname, "../services/transcribe.py");
  const candidates = Array.from(
    new Set(
      [process.env.PYTHON_EXECUTABLE, "python", "py"]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  const errors: string[] = [];

  for (const executable of candidates) {
    try {
      const text = await runTranscribeScript(executable, pythonScriptPath, inputPath);
      if (text) return text;
    } catch (error: any) {
      const message = error?.message || String(error);
      errors.push(message);
      console.warn(`[transcribe] ${message}`);
    }
  }

  if (!candidates.length) {
    throw new Error(
      "Transcription service unavailable: No Python executable available for transcription.",
    );
  }

  const detailedErrors = errors.join(" | ");
  throw new Error(
    detailedErrors
      ? `Transcription service unavailable: ${detailedErrors}`
      : "Transcription service unavailable: Configure an STT model (qwen2-audio/whisper) or install transformers dependencies.",
  );
}

// ─── POST /api/ai/analyze ─────────────────────────────────────────────────────

router.post("/analyze", async (req: Request, res: Response): Promise<void> => {
  try {
    const { transcript, symptoms, vitals, previousSummary } = req.body;
    const transcriptText = normalizeOptionalText(transcript);
    const normalizedSymptoms = normalizeSymptomsInput(symptoms);
    const safeVitals = vitals && typeof vitals === "object"
      ? (vitals as Record<string, unknown>)
      : undefined;
    const previousSummaryTextValue = normalizeOptionalText(previousSummary);

    if (!transcriptText && normalizedSymptoms.length === 0) {
      res.status(400).json({ message: "Provide transcript or symptoms" });
      return;
    }

    const geminiKey = process.env.GEMINI_API_KEY || "";

    // Build the prompt (used by both Ollama and Gemini)
    const symptomList     = normalizedSymptoms.length ? `Reported symptoms: ${normalizedSymptoms.join(", ")}` : "";
    const vitalsText      = safeVitals
      ? `Vitals: ${[
          safeVitals.bloodPressure && `BP ${safeVitals.bloodPressure}`,
          safeVitals.heartRate     && `HR ${safeVitals.heartRate} bpm`,
          safeVitals.temperature   && `Temp ${safeVitals.temperature}°F`,
          safeVitals.oxygenSat     && `SpO2 ${safeVitals.oxygenSat}%`,
          safeVitals.bloodGlucose  && `Blood Glucose ${safeVitals.bloodGlucose} mg/dL`,
        ].filter(Boolean).join(", ")}`
      : "";
    const previousSummaryText = previousSummaryTextValue
      ? `\nPATIENT HISTORY (from previous consultations):\n${previousSummaryTextValue}\n`
      : "";

    const prompt = `You are a medical AI assistant helping a doctor generate clinical documentation.

Given the following consultation data, generate a SOAP note, suggest relevant ICD-10 codes, and extract a clean list of symptoms.
${previousSummaryText}
CONSULTATION TRANSCRIPT:
${transcriptText || "Not provided"}

${symptomList}
${vitalsText}

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "cleanedSymptoms": ["symptom 1", "symptom 2"],
  "soap": {
    "subjective":  "Patient's reported symptoms and history",
    "objective":   "Clinical findings from vitals and examination",
    "assessment":  "Differential diagnoses",
    "plan":        "Recommended treatment plan"
  },
  "icdSuggestions": [
    { "code": "ICD-10 code", "description": "Description" }
  ]
}

Requirements:
- cleanedSymptoms: extract all symptoms, fix spelling, title case, 1-4 words each, no duplicates
- Suggest 2-5 relevant ICD-10-CM codes
- Return ONLY the JSON object, no other text`;

    // ── Try Ollama first (always preferred — local, free) ─────────────────────
    try {
      const raw = await ollamaGenerate(prompt);
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!parsed.soap || !parsed.soap.subjective) throw new Error("Invalid shape from Ollama");

      if (!parsed.icdSuggestions || parsed.icdSuggestions.length === 0) {
        const allSymptoms: string[] = [...normalizedSymptoms];
        if (transcriptText) {
          const lower = transcriptText.toLowerCase();
          for (const term of Object.keys(symptomIcdMap)) {
            if (lower.includes(term) && !allSymptoms.some((s: string) => s.toLowerCase().includes(term))) {
              allSymptoms.push(term);
            }
          }
        }
        parsed.icdSuggestions = matchIcdCodes(allSymptoms);
      }

      res.json({
        cleanedSymptoms: normalizeSymptomsInput(parsed.cleanedSymptoms),
        soap:            parsed.soap,
        icdSuggestions:  parsed.icdSuggestions,
      });
      return;
    } catch (ollamaErr) {
      console.warn("[analyze] Ollama failed, trying Gemini:", ollamaErr);
    }

    // ── Gemini fallback ────────────────────────────────────────────────────────
    let text: string | undefined;
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const ANALYZE_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];

        for (const model of ANALYZE_MODELS) {
          try {
            const response = await ai.models.generateContent({ model, contents: prompt });
            text = response.text?.trim();
            break;
          } catch (err: any) {
            if (err?.status === 429) {
              console.warn(`Analyze: ${model} rate-limited, trying next model...`);
              continue;
            }
            throw err;
          }
        }

        if (!text) throw new Error("Empty response from Gemini (all models)");

        const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        const parsed  = JSON.parse(jsonStr);

        if (!parsed.soap || !parsed.soap.subjective) throw new Error("Invalid response structure from Gemini");

        if (!parsed.icdSuggestions || parsed.icdSuggestions.length === 0) {
          const allSymptoms: string[] = [...normalizedSymptoms];
          if (transcriptText) {
            const lower = transcriptText.toLowerCase();
            for (const term of Object.keys(symptomIcdMap)) {
              if (lower.includes(term) && !allSymptoms.some((s: string) => s.toLowerCase().includes(term))) {
                allSymptoms.push(term);
              }
            }
          }
          parsed.icdSuggestions = matchIcdCodes(allSymptoms);
        }

        res.json({
          cleanedSymptoms: normalizeSymptomsInput(parsed.cleanedSymptoms),
          soap:            parsed.soap,
          icdSuggestions:  parsed.icdSuggestions,
        });
        return;
      } catch (geminiErr) {
        console.error("[analyze] Gemini failed, using keyword fallback:", geminiErr);
      }
    }

    // ── Keyword fallback ───────────────────────────────────────────────────────
    res.json(buildFallbackResponse(transcriptText, normalizedSymptoms, safeVitals));
  } catch (error) {
    console.error("[analyze] Unhandled error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── POST /api/ai/summarize ───────────────────────────────────────────────────

router.post("/summarize", async (req: Request, res: Response): Promise<void> => {
  try {
    const { soap, icdCodes, symptoms, patientName } = req.body;

    if (!soap) {
      res.status(400).json({ message: "SOAP notes are required" });
      return;
    }

    const icdText      = icdCodes?.length
      ? `ICD-10 Codes: ${icdCodes.map((c: { code: string; description: string }) => `${c.code} – ${c.description}`).join(", ")}`
      : "";
    const symptomsText = symptoms?.length ? `Symptoms: ${symptoms.join(", ")}` : "";

    const prompt = `You are a medical assistant. Based on the following clinical notes, generate a clear, plain-language patient summary that a doctor can quickly review before finalizing.

${patientName ? `Patient: ${patientName}` : ""}
${symptomsText}

SOAP Notes:
- Subjective: ${soap.subjective || "N/A"}
- Objective:  ${soap.objective  || "N/A"}
- Assessment: ${soap.assessment || "N/A"}
- Plan:       ${soap.plan       || "N/A"}

${icdText}

Write a concise summary (3-6 sentences) covering:
1. Chief complaint and key symptoms
2. Key findings
3. Diagnosis/assessment
4. Treatment plan and next steps

Respond with ONLY the summary text, no JSON, no markdown headers, no labels.`;

    // ── Try Ollama first ───────────────────────────────────────────────────────
    try {
      const summary = await ollamaGenerate(prompt);
      if (summary) {
        res.json({ summary });
        return;
      }
    } catch (ollamaErr) {
      console.warn("[summarize] Ollama failed, trying Gemini:", ollamaErr);
    }

    // ── Gemini fallback ────────────────────────────────────────────────────────
    const geminiKey = process.env.GEMINI_API_KEY || "";
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];
        let text: string | undefined;

        for (const model of MODELS) {
          try {
            const response = await ai.models.generateContent({ model, contents: prompt });
            text = response.text?.trim();
            break;
          } catch (err: any) {
            if (err?.status === 429) { console.warn(`Summarize: ${model} rate-limited`); continue; }
            throw err;
          }
        }

        if (text) { res.json({ summary: text }); return; }
      } catch (geminiErr) {
        console.error("[summarize] Gemini failed:", geminiErr);
      }
    }

    // ── Text fallback ──────────────────────────────────────────────────────────
    const parts: string[] = [];
    if (soap.assessment) parts.push(soap.assessment);
    if (soap.plan)       parts.push(`Plan: ${soap.plan}`);
    res.json({ summary: parts.join("\n\n") || "Consultation completed." });
  } catch (error) {
    console.error("[summarize] Unhandled error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── POST /api/ai/transcribe ──────────────────────────────────────────────────

router.post("/transcribe", async (req: Request, res: Response): Promise<void> => {
  try {
    const { audio, mimeType } = req.body;

    if (!audio) {
      res.status(400).json({ message: "No audio data provided" });
      return;
    }

    // Decode base64 audio and save to tmp
    const audioBuffer = Buffer.from(audio, "base64");
    const id          = randomUUID();
    const extension   = getAudioExtensionFromMimeType(mimeType);
    const inputPath   = join(tmpdir(), `stt-${id}.${extension}`);
    await writeFile(inputPath, audioBuffer);

    let textResult = "";

    try {
      // Run Python STT with executable fallbacks.
      textResult = await transcribeWithPythonFallbacks(inputPath);
    } finally {
      unlink(inputPath).catch(() => {});
    }

    if (!textResult) {
      res.status(503).json({
        message:
          "Transcription service unavailable. Configure an STT model (qwen2-audio/whisper) or install transformers dependencies.",
      });
      return;
    }

    res.json({ text: textResult });
  } catch (error: any) {
    console.error("[transcribe] Error:", error);

    if (error?.status === 429) {
      res.status(429).json({ message: "Rate limited, please wait" });
      return;
    }

    res.status(503).json({
      message:
        "Transcription service unavailable. Start an STT backend (qwen2-audio/whisper in Ollama) or install Python STT dependencies.",
    });
  }
});

export default router;
