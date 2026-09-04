/**
 * llm-rerank.ts -Step 7: Clinical reranking via OpenAI function call.
 * Ported from docs/main.py lines 1010-1088.
 */

import { openaiChat } from "../utils/openai-helpers.js";
import { RERANK_SYSTEM_PROMPT, RERANK_DISEASES_TOOL } from "../utils/medical-prompts.js";
import type { DiseaseCandidate } from "./vector-store.js";
import type { ExtractedEntities } from "./entity-extraction.js";

const TOP_K = 5;

export async function runRerank(
  candidates: DiseaseCandidate[],
  entities: ExtractedEntities,
  baseConfidence: number,
): Promise<{ ranked: DiseaseCandidate[]; confidence: number }> {
  console.log(`[step7] Reranking ${candidates.length} candidates.`);

  if (!candidates.length) {
    return { ranked: [], confidence: 0.0 };
  }

  if (candidates.length <= 2) {
    const out = candidates.slice(0, TOP_K).map((c, i) => ({
      ...c,
      rank: i + 1,
      rationale: c.rationale ?? "Insufficient candidates for reranking.",
    }));
    return { ranked: out, confidence: baseConfidence };
  }

  const diseaseList = JSON.stringify(
    candidates.slice(0, 15).map((c) => ({
      icd: c.icd_10_code,
      name: c.disease_name,
      score: c.composite_score,
      source: c.source ?? "",
    })),
    null,
    2,
  );

  const clinicalCtx = JSON.stringify(
    {
      symptoms: entities.normalized_symptoms ?? [],
      severity: entities.severity_indicators ?? [],
      body_systems: entities.body_systems ?? [],
      onset: entities.onset,
      duration: entities.duration,
      patient: entities.patient_context ?? {},
    },
    null,
    2,
  );

  try {
    const msg = await openaiChat(
      [
        { role: "system", content: RERANK_SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `CANDIDATE DISEASES:\n${diseaseList}\n\n` +
            `CLINICAL CONTEXT:\n${clinicalCtx}\n\nRerank now.`,
        },
      ],
      {
        temperature: 0.0,
        max_tokens: 1024,
        tools: [RERANK_DISEASES_TOOL],
        tool_choice: { type: "function", function: { name: "rerank_diseases" } },
      },
    );

    const tc = msg.tool_calls?.[0];
    const data =
      tc && tc.type === "function"
        ? JSON.parse(tc.function.arguments)
        : {};

    const icdPriority: string[] = data.ranked_icd_codes ?? [];
    const rationales: string[] = data.ranking_rationale ?? [];
    const confAdj: number = parseFloat(data.top_confidence_adjustment ?? "0") || 0;

    const icdIndex = new Map<string, DiseaseCandidate>();
    for (const c of candidates) {
      if (c.icd_10_code) icdIndex.set(c.icd_10_code, c);
    }

    const ranked: DiseaseCandidate[] = [];
    for (let i = 0; i < icdPriority.length; i++) {
      const icd = icdPriority[i];
      const entry = icdIndex.get(icd);
      if (entry) {
        ranked.push({
          ...entry,
          rank: i + 1,
          rationale: i < rationales.length ? rationales[i] : "",
        });
      }
    }

    // Append any candidates not returned by the LLM
    const returned = new Set(icdPriority);
    for (const c of candidates) {
      if (!returned.has(c.icd_10_code)) {
        ranked.push(c);
      }
    }

    const adjConf = +Math.min(Math.max(baseConfidence + confAdj, 0.0), 1.0).toFixed(4);
    console.log(
      `[step7] Top: ${ranked[0]?.disease_name ?? "—"} (conf=${adjConf.toFixed(4)})`,
    );
    return { ranked: ranked.slice(0, TOP_K), confidence: adjConf };
  } catch (err) {
    console.error("[step7] Rerank failed:", err, "-score fallback.");
    const sorted = [...candidates].sort(
      (a, b) => (b.composite_score ?? 0) - (a.composite_score ?? 0),
    );
    const fallback = sorted.slice(0, TOP_K).map((c, i) => ({
      ...c,
      rank: i + 1,
      rationale: "Ordered by composite score (rerank fallback).",
    }));
    return { ranked: fallback, confidence: baseConfidence };
  }
}
