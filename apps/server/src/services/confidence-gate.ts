/**
 * confidence-gate.ts -Step 3: Pure-math confidence gate.
 * Ported from docs/main.py lines 701-738.
 */

import {
  TOP_SCORE_WEIGHT,
  COVERAGE_WEIGHT,
  DIVERSITY_WEIGHT,
  MIN_CANDIDATES,
  CONFIDENCE_GATE,
} from "../utils/medical-prompts.js";
import type { DiseaseCandidate } from "./vector-store.js";

function coverage(symptoms: string[], candidates: DiseaseCandidate[]): number {
  if (!symptoms.length || !candidates.length) return 0.0;
  let matched = 0;
  for (const s of symptoms) {
    if (
      candidates.some((c) =>
        (c.disease_name ?? "").toLowerCase().includes(s.toLowerCase()),
      )
    ) {
      matched++;
    }
  }
  return matched / symptoms.length;
}

function diversity(candidates: DiseaseCandidate[]): number {
  if (candidates.length < 2) return 0.0;
  const specs = candidates.map((c) => c.specialty || "unknown");
  const unique = new Set(specs);
  return Math.min(unique.size / candidates.length, 1.0);
}

export function runCheckConfidence(
  candidates: DiseaseCandidate[],
  symptoms: string[],
): { score: number; sufficient: boolean } {
  if (!candidates.length) return { score: 0.0, sufficient: false };

  const topScore = candidates[0]?.composite_score ?? 0.0;
  const cov = coverage(symptoms, candidates);
  const div = diversity(candidates);
  const countFactor =
    candidates.length >= MIN_CANDIDATES ? 1.0 : candidates.length / MIN_CANDIDATES;

  let score =
    (TOP_SCORE_WEIGHT * topScore + COVERAGE_WEIGHT * cov + DIVERSITY_WEIGHT * div) *
    countFactor;
  score = +Math.min(score, 1.0).toFixed(4);
  const sufficient = score >= CONFIDENCE_GATE;

  console.log(
    `[step3] top=${topScore.toFixed(3)} cov=${cov.toFixed(3)} div=${div.toFixed(3)} cf=${countFactor.toFixed(2)} → score=${score.toFixed(4)} sufficient=${sufficient}`,
  );
  return { score, sufficient };
}
