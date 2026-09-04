/**
 * response-generator.ts -Steps 8-9: Grounded response generation + doctor review panel.
 * Ported from docs/main.py lines 1091-1223.
 */

import { openaiChatText } from "../utils/openai-helpers.js";
import { RESPONSE_SYSTEM_PROMPT, DISCLAIMER } from "../utils/medical-prompts.js";
import type { DiseaseCandidate } from "./vector-store.js";
import type { ExtractedEntities } from "./entity-extraction.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDiseaseContext(ranked: DiseaseCandidate[]): string {
  const parts = ranked.map((d, i) => {
    const raw = d.raw_doc ?? d;
    return {
      rank: i + 1,
      disease_name: d.disease_name,
      icd_10_code: d.icd_10_code,
      specialty: d.specialty || raw.specialty || "",
      description: d.description || raw.description || "",
      composite_score: d.composite_score,
      source: d.source,
      source_url: d.source_url || "",
      symptoms: d.symptoms?.length ? d.symptoms : raw.symptoms ?? [],
      treatments: d.treatments?.length ? d.treatments : raw.treatments ?? [],
      medications: d.medications?.length ? d.medications : raw.medications ?? [],
      rationale: d.rationale ?? "",
    };
  });
  return JSON.stringify(parts, null, 2);
}

function confLabel(score: number): string {
  if (score >= 0.7) return "HIGH";
  if (score >= 0.5) return "MEDIUM";
  return "LOW";
}

// ─── Step 8: Grounded Response ───────────────────────────────────────────────

export async function runGenerateResponse(
  ranked: DiseaseCandidate[],
  confidence: number,
  rawQuery: string,
  entities: ExtractedEntities,
  dataSourceNote = "vector_store",
): Promise<{
  text: string;
  citations: Array<{
    rank: number;
    disease_name: string;
    icd_10_code: string;
    source: string;
    source_url: string;
  }>;
  uncertaintyNote: string | null;
}> {
  console.log(
    `[step8] Generating response: ${ranked.length} diseases, conf=${confidence.toFixed(3)}.`,
  );

  if (!ranked.length) {
    return {
      text:
        "No matching disease records found in the knowledge base. " +
        "Please consult a qualified healthcare professional." +
        DISCLAIMER,
      citations: [],
      uncertaintyNote: "No records found.",
    };
  }

  let uncertaintyNote: string | null = null;
  if (confidence < 0.5) {
    uncertaintyNote =
      `\u26A0 LOW CONFIDENCE (${(confidence * 100).toFixed(0)}%): Limited records matched these symptoms. ` +
      "Independent clinical evaluation is essential.";
  }

  let userMsg =
    `PATIENT SYMPTOM DESCRIPTION:\n${rawQuery}\n\n` +
    `EXTRACTED CLINICAL CONTEXT:\n${JSON.stringify(entities, null, 2)}\n\n` +
    `DISEASE DATA -GROUND YOUR RESPONSE EXCLUSIVELY IN THIS:\n` +
    `${buildDiseaseContext(ranked)}\n\n` +
    `CONFIDENCE: ${confidence.toFixed(2)} (${confLabel(confidence)})\n` +
    `DATA SOURCE: ${dataSourceNote}\n\n` +
    `DISCLAIMER (append verbatim):\n${DISCLAIMER}\n\n` +
    "Generate the clinical decision-support response now. Follow the output format exactly.";

  if (uncertaintyNote) {
    userMsg += `\n\nUNCERTAINTY NOTE TO INCLUDE:\n${uncertaintyNote}`;
  }

  let finalText = await openaiChatText(
    [
      { role: "system", content: RESPONSE_SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ],
    0.1,
    3500,
  );

  if (!finalText.includes(DISCLAIMER.trim())) {
    finalText += DISCLAIMER;
  }

  const citations = ranked.map((d, i) => ({
    rank: d.rank ?? i + 1,
    disease_name: d.disease_name ?? "",
    icd_10_code: d.icd_10_code ?? "",
    source: d.source ?? "",
    source_url: d.source_url ?? "",
  }));

  console.log(`[step8] Response ready. ${citations.length} citations.`);
  return { text: finalText, citations, uncertaintyNote };
}

// ─── Step 9: Doctor Review Panel ─────────────────────────────────────────────

export interface DiseasePanelEntry {
  icd_10_code: string;
  disease_name: string;
  specialty: string;
  category: string;
  description: string;
  alternative_names: string[];
  symptoms: any[];
  treatments: any[];
  medications: any[];
  composite_score: number;
  rank: number | null;
  rationale: string;
  source: string;
  source_url: string;
  data_origin: string;
}

export function buildFullDiseasePanel(
  ranked: DiseaseCandidate[],
  allCandidates: DiseaseCandidate[],
): DiseasePanelEntry[] {
  const seen = new Set<string>();
  const panel: DiseasePanelEntry[] = [];

  function norm(d: DiseaseCandidate, rank: number | null): DiseasePanelEntry {
    const raw = d.raw_doc ?? d;
    return {
      icd_10_code: d.icd_10_code ?? "",
      disease_name: d.disease_name ?? "",
      specialty: d.specialty || raw.specialty || "",
      category: d.category || raw.category || "",
      description: d.description || raw.description || raw.confidence_note || "",
      alternative_names: d.alternative_names ?? raw.alternative_names ?? [],
      symptoms: d.symptoms?.length ? d.symptoms : raw.symptoms ?? [],
      treatments: d.treatments?.length ? d.treatments : raw.treatments ?? [],
      medications: d.medications?.length ? d.medications : raw.medications ?? [],
      composite_score: +(d.composite_score ?? 0).toFixed(4),
      rank,
      rationale: d.rationale ?? "",
      source: d.source ?? "",
      source_url: d.source_url ?? "",
      data_origin: (d as any).data_origin ?? "vector_store",
    };
  }

  // Ranked first
  for (let i = 0; i < ranked.length; i++) {
    const icd = ranked[i].icd_10_code ?? "";
    if (icd && !seen.has(icd)) {
      seen.add(icd);
      panel.push(norm(ranked[i], i + 1));
    }
  }

  // Remaining unranked
  for (const d of allCandidates) {
    const icd = d.icd_10_code ?? "";
    if (icd && !seen.has(icd)) {
      seen.add(icd);
      panel.push(norm(d, null));
    }
  }

  return panel;
}
