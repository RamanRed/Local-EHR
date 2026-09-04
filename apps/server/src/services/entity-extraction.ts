/**
 * entity-extraction.ts -Step 1: NLP entity extraction via forced OpenAI function call.
 * Ported from docs/main.py lines 634-656.
 */

import { openaiChat } from "../utils/openai-helpers.js";
import { ENTITY_SYSTEM_PROMPT, EXTRACT_ENTITIES_TOOL } from "../utils/medical-prompts.js";

export interface ExtractedEntities {
  normalized_symptoms: string[];
  body_systems: string[];
  severity_indicators: string[];
  duration: string | null;
  onset: string | null;
  patient_context: {
    age_group: string | null;
    sex: string | null;
    reported_conditions: string[];
  };
  ambiguous_terms: string[];
  extraction_confidence: number;
}

export async function runExtractEntities(rawQuery: string): Promise<ExtractedEntities> {
  console.log(`[step1] Extracting entities from: '${rawQuery.slice(0, 80)}'`);

  const msg = await openaiChat(
    [
      { role: "system", content: ENTITY_SYSTEM_PROMPT },
      { role: "user", content: `Patient input:\n\n${rawQuery}` },
    ],
    {
      temperature: 0.0,
      max_tokens: 1024,
      tools: [EXTRACT_ENTITIES_TOOL],
      tool_choice: { type: "function", function: { name: "extract_medical_entities" } },
    },
  );

  let args: ExtractedEntities;
  const tc = msg.tool_calls?.[0];
  if (tc && tc.type === "function") {
    args = JSON.parse(tc.function.arguments);
  } else {
    args = {
      normalized_symptoms: [],
      body_systems: [],
      severity_indicators: [],
      duration: null,
      onset: null,
      patient_context: { age_group: null, sex: null, reported_conditions: [] },
      ambiguous_terms: [],
      extraction_confidence: 0.0,
    };
  }

  console.log(
    `[step1] ${args.normalized_symptoms.length} symptoms (confidence=${args.extraction_confidence.toFixed(2)}):`,
    args.normalized_symptoms,
  );
  return args;
}
