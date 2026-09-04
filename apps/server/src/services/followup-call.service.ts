import WebSocket from "ws";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "../lib/prisma.js";
import { PHIEncryption } from "./phi-encryption.js";
import { HIPAALogger } from "./hipaa-logger.js";
import {
  FOLLOWUP_SYSTEM_PROMPT_TEMPLATE,
  FOLLOWUP_SUMMARY_PROMPT,
} from "../utils/followup-prompts.js";
import type { FollowUpCallStructuredFindings } from "@vox/shared-types";

// ─── Active session registry ────────────────────────────────────────────────
const activeSessions = new Map<string, GeminiLiveSession>();

export function getSession(callId: string): GeminiLiveSession | undefined {
  return activeSessions.get(callId);
}

// ─── Build patient context for prompts ──────────────────────────────────────

export async function buildPatientContext(
  patientId: string,
  consultId: string
): Promise<{ patientName: string; contextString: string }> {
  const patient = await prisma.patient.findUniqueOrThrow({
    where: { id: patientId },
    include: {
      vitals: true,
      conditions: true,
      medications: true,
    },
  });

  const consult = await prisma.consult.findUniqueOrThrow({
    where: { id: consultId },
  });

  // Decrypt SOAP fields
  const soapSubjective = PHIEncryption.decrypt(consult.soapSubjective);
  const soapObjective = PHIEncryption.decrypt(consult.soapObjective);
  const soapAssessment = PHIEncryption.decrypt(consult.soapAssessment);
  const soapPlan = PHIEncryption.decrypt(consult.soapPlan);

  const parts: string[] = [];

  // Conditions / diagnoses
  if (patient.conditions.length > 0) {
    const condList = patient.conditions
      .map((c) => `${c.display} (${c.code})`)
      .join(", ");
    parts.push(`- Diagnoses: ${condList}`);
  }

  // Current medications
  if (patient.medications.length > 0) {
    const medList = patient.medications
      .map((m) => `${m.drugName} ${m.dosage} ${m.frequency}`)
      .join("; ");
    parts.push(`- Current Medications: ${medList}`);
  }

  // Latest vitals
  if (patient.vitals) {
    const v = patient.vitals;
    const vitalParts: string[] = [];
    if (v.bloodPressure) vitalParts.push(`BP ${v.bloodPressure}`);
    if (v.heartRate) vitalParts.push(`HR ${v.heartRate} bpm`);
    if (v.temperature) vitalParts.push(`Temp ${v.temperature}°F`);
    if (v.oxygenSat) vitalParts.push(`SpO2 ${v.oxygenSat}%`);
    if (vitalParts.length > 0) {
      parts.push(`- Last Vitals: ${vitalParts.join(", ")}`);
    }
    if (v.symptoms.length > 0) {
      parts.push(`- Reported Symptoms: ${v.symptoms.join(", ")}`);
    }
  }

  // SOAP from last consult
  if (soapAssessment) parts.push(`- Last Assessment: ${soapAssessment}`);
  if (soapPlan) parts.push(`- Treatment Plan: ${soapPlan}`);

  return {
    patientName: patient.name,
    contextString: parts.join("\n"),
  };
}

// ─── Gemini Live Session ────────────────────────────────────────────────────

export interface GeminiLiveCallbacks {
  onAudioOutput: (base64Audio: string) => void;
  onTranscriptUpdate: (role: "user" | "model", text: string) => void;
  onSessionEnd: () => void;
  onError: (error: string) => void;
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private transcriptParts: { role: "user" | "model"; text: string }[] = [];
  private callbacks: GeminiLiveCallbacks;
  private callId: string;
  private setupComplete = false;

  constructor(callId: string, callbacks: GeminiLiveCallbacks) {
    this.callId = callId;
    this.callbacks = callbacks;
  }

  async connect(systemPrompt: string): Promise<void> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    return new Promise<void>((resolve, reject) => {
      // 15-second timeout so we don't hang forever
      const timeout = setTimeout(() => {
        if (!this.setupComplete) {
          console.error(`[Gemini] Connection timed out for callId=${this.callId}`);
          this.ws?.close();
          reject(new Error("Gemini Live connection timed out (15s)"));
        }
      }, 15000);

      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        console.log(`[Gemini] WebSocket opened for callId=${this.callId}, sending setup...`);
        // Send setup message
        const setupMsg = {
          setup: {
            model: "models/gemini-2.0-flash-live",
            generationConfig: {
              responseModalities: ["AUDIO", "TEXT"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Aoede" },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
          },
        };
        this.ws!.send(JSON.stringify(setupMsg));
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());

          // Setup complete acknowledgement
          if (msg.setupComplete) {
            this.setupComplete = true;
            clearTimeout(timeout);
            activeSessions.set(this.callId, this);
            console.log(`[Gemini] Setup complete for callId=${this.callId}`);
            resolve();
            return;
          }

          // Server content (audio + text from model)
          if (msg.serverContent) {
            const parts = msg.serverContent.modelTurn?.parts || [];
            for (const part of parts) {
              // Text transcript from model
              if (part.text) {
                this.transcriptParts.push({ role: "model", text: part.text });
                this.callbacks.onTranscriptUpdate("model", part.text);
              }
              // Audio output from model
              if (part.inlineData?.data) {
                this.callbacks.onAudioOutput(part.inlineData.data);
              }
            }
          }
        } catch (err) {
          console.error("Gemini WS parse error:", err);
        }
      });

      this.ws.on("error", (err) => {
        console.error("Gemini WS error:", err);
        clearTimeout(timeout);
        this.callbacks.onError(err.message);
        if (!this.setupComplete) reject(err);
      });

      this.ws.on("close", () => {
        clearTimeout(timeout);
        this.callbacks.onSessionEnd();
        activeSessions.delete(this.callId);
      });
    });
  }

  sendAudio(base64Data: string, mimeType: string = "audio/pcm"): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const msg = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType,
            data: base64Data,
          },
        ],
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  addUserTranscript(text: string): void {
    this.transcriptParts.push({ role: "user", text });
  }

  getTranscript(): string {
    return this.transcriptParts
      .map((t) => `${t.role === "user" ? "Patient" : "Assistant"}: ${t.text}`)
      .join("\n");
  }

  close(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    activeSessions.delete(this.callId);
  }
}

// ─── Generate call summary ─────────────────────────────────────────────────

export async function generateCallSummary(
  transcript: string,
  patientContext: string
): Promise<{
  summary: string;
  structuredFindings: FollowUpCallStructuredFindings;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = FOLLOWUP_SUMMARY_PROMPT
    .replace("{{patientContext}}", patientContext)
    .replace("{{transcript}}", transcript);

  const models = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];
  let text: string | undefined;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      text = response.text?.trim();
      break;
    } catch (err: any) {
      if (err?.status === 429) {
        console.warn(`Summary: ${model} rate-limited, trying next...`);
        continue;
      }
      throw err;
    }
  }

  if (!text) throw new Error("Empty response from Gemini (all models)");

  const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(jsonStr);

  return {
    summary: parsed.summary,
    structuredFindings: parsed.structuredFindings,
  };
}

// ─── Finalize call ──────────────────────────────────────────────────────────

export async function finalizeCall(callId: string): Promise<void> {
  const session = activeSessions.get(callId);
  const transcript = session?.getTranscript() || "";

  // Get the call record for context
  const call = await prisma.followUpCall.findUniqueOrThrow({
    where: { id: callId },
  });

  const startedAt = call.startedAt || call.createdAt;
  const durationSeconds = Math.round(
    (Date.now() - startedAt.getTime()) / 1000
  );

  try {
    // Build patient context for the summary prompt
    const { contextString } = await buildPatientContext(
      call.patientId,
      call.consultId
    );

    const { summary, structuredFindings } = await generateCallSummary(
      transcript,
      contextString
    );

    // Encrypt PHI before persisting
    const encryptedTranscript = PHIEncryption.encrypt(transcript);
    const encryptedSummary = PHIEncryption.encrypt(summary);

    await prisma.followUpCall.update({
      where: { id: callId },
      data: {
        status: "completed",
        transcript: encryptedTranscript,
        summary: encryptedSummary,
        structuredFindings: structuredFindings as any,
        urgencyLevel: structuredFindings.urgencyLevel as any,
        completedAt: new Date(),
        durationSeconds,
      },
    });

    await HIPAALogger.logAccess("SYSTEM", "followup_call", callId, "WRITE", {
      action: "finalize",
      urgencyLevel: structuredFindings.urgencyLevel,
    });
  } catch (err) {
    console.error("Failed to finalize call:", err);

    // Still save the transcript even if summary generation fails
    const encryptedTranscript = PHIEncryption.encrypt(transcript);
    await prisma.followUpCall.update({
      where: { id: callId },
      data: {
        status: "failed",
        transcript: encryptedTranscript,
        completedAt: new Date(),
        durationSeconds,
      },
    });
  } finally {
    session?.close();
  }
}
