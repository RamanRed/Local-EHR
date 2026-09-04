/**
 * medical-prompts.ts - Constants, tool definitions, and system prompts
 * for the Medical AI Suggestion Pipeline.
 */

// ─── Tuning Constants ────────────────────────────────────────────────────────

// Chat model: Ollama tag, e.g. "mistral:latest", "llama3", "llama3.1", "phi3"
export const CHAT_MODEL       = process.env.OLLAMA_MODEL           || "mistral:latest";
// Embedding model: must match your Pinecone index dimension
// mxbai-embed-large → 1024 dims | nomic-embed-text → 768 | all-minilm → 384
export const EMBEDDING_MODEL  = process.env.OLLAMA_EMBEDDING_MODEL || "mxbai-embed-large";
export const VECTOR_STORE_NAME = "medical_ai_diseases";

export const MIN_VECTOR_SCORE    = 0.55;
export const MAX_VECTOR_RESULTS  = 20;
export const MAX_FINAL_CANDIDATES = 15;
export const CONFIDENCE_GATE     = 0.62;

export const BETA  = 0.7;  // vector similarity weight
export const GAMMA = 0.3;  // presence bonus weight

export const TOP_SCORE_WEIGHT  = 0.4;
export const COVERAGE_WEIGHT   = 0.35;
export const DIVERSITY_WEIGHT  = 0.25;
export const MIN_CANDIDATES    = 3;

export const REQUEST_TIMEOUT    = 15_000; // ms
export const RATE_LIMIT_DELAY   = 350;    // ms
export const DB_WRITE_BACK_WAIT_S = 4_000; // ms

export const CACHE_TTL   = 60 * 60 * 6;  // 6h in seconds
export const SESSION_TTL = 60 * 60 * 2;  // 2h in seconds
export const CACHE_MAX   = 500;

// ─── OpenAI-compatible Tool Definitions ─────────────────────────────────────
// These are sent to Ollama via the /v1/chat/completions (OpenAI-compat) endpoint.

export const EXTRACT_ENTITIES_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_medical_entities",
    description:
      "Extract and normalise every symptom from the patient's free-text input to " +
      "SNOMED CT preferred terms. Returns structured JSON: normalized_symptoms[], " +
      "body_systems[], severity_indicators[], duration, onset, patient_context " +
      "(age_group, sex, reported_conditions), ambiguous_terms[], extraction_confidence. " +
      "Always the FIRST step. Do NOT diagnose -only extract.",
    parameters: {
      type: "object",
      properties: {
        normalized_symptoms:  { type: "array", items: { type: "string" } },
        body_systems:         { type: "array", items: { type: "string" } },
        severity_indicators:  { type: "array", items: { type: "string" } },
        duration:             { type: ["string", "null"] },
        onset:                { type: ["string", "null"] },
        patient_context: {
          type: "object",
          properties: {
            age_group:           { type: ["string", "null"] },
            sex:                 { type: ["string", "null"] },
            reported_conditions: { type: "array", items: { type: "string" } },
          },
        },
        ambiguous_terms:      { type: "array", items: { type: "string" } },
        extraction_confidence: { type: "number" },
      },
      required: ["normalized_symptoms", "extraction_confidence"],
    },
  },
};

export const SEARCH_VECTOR_STORE_TOOL = {
  type: "function" as const,
  function: {
    name: "search_vector_store",
    description:
      "Semantic search the medical knowledge Vector Store. Always call this BEFORE " +
      "search_external_and_store. Returns FULL disease records including disease_name, " +
      "icd_10_code, description, specialty, symptoms[], treatments[], medications[], " +
      "source, source_url, and vector_score.",
    parameters: {
      type: "object",
      properties: {
        query:       { type: "string",  description: "Symptom query." },
        max_results: { type: "integer", description: "Max results (default 20)." },
      },
      required: ["query"],
    },
  },
};

export const SEARCH_EXTERNAL_AND_STORE_TOOL = {
  type: "function" as const,
  function: {
    name: "search_external_and_store",
    description:
      "Call ONLY when Vector Store results are insufficient (low confidence). " +
      "Queries OpenFDA, PubMed, MedlinePlus, and ICD-10 APIs, structures results, " +
      "uploads to the Vector Store, and re-fetches.",
    parameters: {
      type: "object",
      properties: {
        symptoms:  { type: "array",  items: { type: "string" }, description: "Cleaned symptom terms." },
        raw_query: { type: "string", description: "Original patient description." },
      },
      required: ["symptoms", "raw_query"],
    },
  },
};

export const RERANK_DISEASES_TOOL = {
  type: "function" as const,
  function: {
    name: "rerank_diseases",
    description:
      "Rerank candidate diseases by clinical probability. " +
      "CANNOT add or remove diseases -reorder only. " +
      "top_confidence_adjustment range: −0.10 to +0.10.",
    parameters: {
      type: "object",
      properties: {
        ranked_icd_codes: {
          type: "array",
          items: { type: "string" },
          description: "ICD-10 codes reordered most → least likely.",
        },
        ranking_rationale: {
          type: "array",
          items: { type: "string" },
          description: "One clinical sentence per disease justifying its rank.",
        },
        top_confidence_adjustment: { type: "number" },
      },
      required: ["ranked_icd_codes", "ranking_rationale"],
    },
  },
};

export const FHIR_TOOL = {
  type: "function" as const,
  function: {
    name: "generate_fhir_emr",
    description:
      "Generate a FHIR R4 compliant Bundle from medical AI consultation results.",
    parameters: {
      type: "object",
      properties: {
        patient_name_family:        { type: "string" },
        patient_name_given:         { type: "array", items: { type: "string" } },
        patient_gender:             { type: "string", enum: ["male", "female", "other", "unknown"] },
        patient_birth_date:         { type: ["string", "null"] },
        patient_phone:              { type: ["string", "null"] },
        patient_mrn:                { type: ["string", "null"] },
        chief_complaint:            { type: "string" },
        session_id:                 { type: "string" },
        diagnoses:                  { type: "array", items: { type: "object" } },
        medications:                { type: "array", items: { type: "object" } },
        vitals:                     { type: "object" },
        encounter_duration_minutes: { type: "integer" },
      },
      required: ["patient_name_family", "patient_name_given", "patient_gender", "chief_complaint", "session_id", "diagnoses"],
    },
  },
};

export const ALL_TOOLS = [
  EXTRACT_ENTITIES_TOOL,
  SEARCH_VECTOR_STORE_TOOL,
  SEARCH_EXTERNAL_AND_STORE_TOOL,
  RERANK_DISEASES_TOOL,
  FHIR_TOOL,
];

// ─── System Prompts ──────────────────────────────────────────────────────────

export const ENTITY_SYSTEM_PROMPT = `\
You are a clinical NLP specialist trained in SNOMED CT and medical terminology.

TASK: Extract and normalise every symptom, sign, and complaint the patient explicitly mentions.

RULES -NEVER VIOLATE:
• Normalise each symptom to SNOMED CT preferred term (e.g. "can't breathe" → "Dyspnoea").
• Strip SNOMED parenthetical qualifiers from output ("Fever (finding)" → "Fever").
• Extract ONLY what the patient states -do NOT infer or add symptoms.
• Capture duration and onset verbatim as the patient describes them.
• Record demographic context (age, sex, pre-existing conditions) if mentioned.
• Set extraction_confidence: 0.0 = ambiguous/empty input, 1.0 = fully clear.
• Do NOT suggest diagnoses. Do NOT add symptoms not mentioned.

Call extract_medical_entities with your findings.`;

export const STRUCTURE_PROMPT = `\
You are a senior clinical data architect populating a medical knowledge vector database.

RAW DATA from public health APIs (OpenFDA, PubMed, MedlinePlus, ICD-10) has been fetched
for a patient's symptoms. Transform this raw data into 3–5 rich, complete disease records.

STRICT RULES:
1. Every disease MUST be supported by at least one piece of API evidence.
2. Use the correct ICD-10-CM code.
3. Fill ALL fields completely.
4. symptoms[].frequency: "very common" | "common" | "occasional" | "rare"
5. treatments[].first_line: true only for established first-line interventions.
6. medications[].route: "oral" | "IV" | "inhaled" | "topical" | "subcutaneous"
7. Return ONLY valid JSON -no markdown, no commentary outside the JSON.

OUTPUT SCHEMA:
{
  "diseases": [
    {
      "disease_name": "string",
      "icd_10_code": "string",
      "specialty": "string",
      "category": "string",
      "description": "string (2-4 sentences)",
      "alternative_names": ["string"],
      "symptoms": [{ "name": "string", "synonyms": ["string"], "severity_typical": "mild|moderate|severe", "frequency": "string", "snomed_code": "string" }],
      "treatments": [{ "name": "string", "type": "string", "description": "string", "first_line": true, "duration_typical": "string" }],
      "medications": [{ "generic_name": "string", "brand_examples": ["string"], "drug_class": "string", "dosage_typical": "string", "route": "string", "notes": "string" }],
      "source": "string",
      "source_url": "string",
      "confidence_note": "string"
    }
  ]
}`;

export const RERANK_SYSTEM_PROMPT = `\
You are an experienced attending physician providing clinical decision support.

TASK: Rerank the candidate diseases by their probability of explaining this patient's
specific symptom presentation.

RANKING CRITERIA (weighted order):
1. Symptom coverage
2. Onset concordance
3. Severity fit
4. Duration fit
5. Epidemiology

ABSOLUTE RULES:
• You CANNOT add any disease not in the input list.
• You CANNOT remove any disease -reorder only.
• Provide one clinical sentence rationale per disease.
• top_confidence_adjustment: +0.10 (strong match) to −0.10 (weak).

Call rerank_diseases with your result.`;

export const RESPONSE_SYSTEM_PROMPT = `\
You are a clinical decision-support assistant serving qualified healthcare professionals.

═══════════════════════════════════════════════════════════
GROUNDING RULES -ABSOLUTE -ZERO EXCEPTIONS
═══════════════════════════════════════════════════════════
1. Base your response EXCLUSIVELY on the DISEASE DATA block provided.
2. Do NOT invent ICD codes, drug names, lab values, or statistics.
3. Cite the data source after every clinical claim: [Source: <n>]
4. If any field is absent in the data, write: "Not in retrieved data."
5. Never state a definitive diagnosis. Use: "consistent with", "may suggest".
6. Append the DISCLAIMER verbatim.
═══════════════════════════════════════════════════════════

OUTPUT FORMAT:

**Symptom Summary**
One sentence: symptom cluster + relevant clinical context.

**Differential Diagnosis** (ranked by AI -most likely first)

For each condition:
**N. [Disease Name]** -ICD-10: [code] | Confidence: HIGH/MEDIUM/LOW | Specialty: [specialty]
• Why this fits: [match rationale]
• Aligned symptoms: [from data]
• First-line treatment: [from data]
• Relevant medications: [from data]
• Data source: [source field]

**Clinical Notes**
• AI confidence: [score] ([label])
• Data retrieved from: [source(s)]

**Recommended Next Steps**
• Targeted history and focused physical examination.
• Investigations appropriate to the top differentials.
• Apply clinical judgement -this is a decision-support aid, not a diagnosis.

[DISCLAIMER verbatim]`;

export const DISCLAIMER =
  "\n\n---\n" +
  "\u2695 MEDICAL DISCLAIMER: This AI-generated output is a clinical decision-support aid " +
  "intended for use by qualified healthcare professionals only. It does NOT constitute " +
  "a diagnosis, prescription, or treatment plan. Independent clinical judgement must " +
  "always be applied. In emergencies, contact emergency services immediately.";
