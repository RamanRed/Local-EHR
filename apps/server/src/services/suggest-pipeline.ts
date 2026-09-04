/**
 * suggest-pipeline.ts -Pipeline orchestrator + doctor confirmation flow.
 * Ported from docs/main.py lines 1226-1446.
 */

import { CONFIDENCE_GATE } from "../utils/medical-prompts.js";
import { generateFhirBundle, saveFhirBundle } from "../utils/fhir-bundle-builder.js";
import { runExtractEntities, type ExtractedEntities } from "./entity-extraction.js";
import { runRetrieveFromDb, symptomHash, type DiseaseCandidate } from "./vector-store.js";
import { runCheckConfidence } from "./confidence-gate.js";
import { runExternalSearchStoreAndRefetch } from "./external-api-search.js";
import { runRerank } from "./llm-rerank.js";
import {
  runGenerateResponse,
  buildFullDiseasePanel,
  type DiseasePanelEntry,
} from "./response-generator.js";
import {
  cacheGet,
  cacheSet,
  hotClusterInc,
  sessionStore,
  sessionGet,
  sessionClear,
} from "./session-store.js";

function confLabel(score: number): string {
  if (score >= 0.7) return "HIGH";
  if (score >= 0.5) return "MEDIUM";
  return "LOW";
}

// ─── Pipeline Orchestrator ───────────────────────────────────────────────────

export interface PipelineResult {
  final_response: string;
  confidence_score: number;
  confidence_label: string;
  citations: Array<{
    rank: number;
    disease_name: string;
    icd_10_code: string;
    source: string;
    source_url: string;
  }>;
  uncertainty_note: string | null;
  new_knowledge_stored: boolean;
  db_write_back: boolean;
  all_diseases: DiseasePanelEntry[];
  session_id: string;
  data_source: string;
}

export async function runPipeline(
  rawQuery: string,
  sessionId: string,
): Promise<PipelineResult> {
  console.log("=".repeat(70));
  console.log(`[pipeline] START | session=${sessionId} | '${rawQuery.slice(0, 80)}'`);
  console.log("=".repeat(70));

  // Response cache check
  const cacheKey = symptomHash(rawQuery.toLowerCase().split(/\s+/));
  const cached = cacheGet(`response:${cacheKey}`);
  if (cached?.response) {
    console.log("[pipeline] Cache hit.");
    return {
      final_response: cached.response,
      confidence_score: cached.confidence ?? 0.0,
      confidence_label: confLabel(cached.confidence ?? 0.0),
      citations: [],
      uncertainty_note: null,
      new_knowledge_stored: false,
      db_write_back: false,
      all_diseases: [],
      session_id: sessionId,
      data_source: "cache",
    };
  }

  // Step 1
  const entities: ExtractedEntities = await runExtractEntities(rawQuery);
  const symptoms = entities.normalized_symptoms ?? [];

  // Step 2
  let candidates: DiseaseCandidate[] = await runRetrieveFromDb(symptoms);

  // Step 3
  let { score: confidence, sufficient } = runCheckConfidence(candidates, symptoms);

  // Steps 4-6 (conditional)
  let externalRecords: Record<string, any>[] = [];
  let dbWriteBack = false;
  let dataSource = "vector_store";

  if (!sufficient) {
    console.log(
      `[pipeline] Confidence ${confidence.toFixed(4)} < ${CONFIDENCE_GATE.toFixed(2)} → external APIs + DB write-back.`,
    );
    const extResult = await runExternalSearchStoreAndRefetch(
      symptoms,
      rawQuery,
      candidates,
    );
    externalRecords = extResult.externalRecords;
    candidates = extResult.candidates;
    dbWriteBack = extResult.dbWriteBack;

    if (dbWriteBack) {
      dataSource = "external_apis → vector_store (write-back, served from DB)";
      const post = runCheckConfidence(candidates, symptoms);
      confidence = post.score;
      console.log(`[pipeline] Post-write-back confidence: ${confidence.toFixed(4)}`);
    } else {
      dataSource = "external_apis (structured, fallback -write-back failed)";
    }
  } else {
    console.log(
      `[pipeline] Confidence ${confidence.toFixed(4)} ≥ ${CONFIDENCE_GATE.toFixed(2)} → served from Vector Store.`,
    );
  }

  // Step 7
  const reranked = await runRerank(candidates, entities, confidence);
  confidence = reranked.confidence;

  // Step 8
  const response = await runGenerateResponse(
    reranked.ranked,
    confidence,
    rawQuery,
    entities,
    dataSource,
  );

  // Cache and hot-cluster tracking
  if (symptoms.length) {
    cacheSet(`response:${cacheKey}`, response.text, confidence);
    hotClusterInc(symptomHash(symptoms));
  }

  // Step 9
  const allDiseases = buildFullDiseasePanel(reranked.ranked, candidates);

  // Store session for /confirm
  sessionStore(sessionId, {
    all_diseases: allDiseases,
    entities,
    raw_query: rawQuery,
    confidence,
    external_records: externalRecords,
    ranked: reranked.ranked,
    data_source: dataSource,
  });

  console.log(
    `[pipeline] DONE | conf=${confidence.toFixed(4)} ${confLabel(confidence)} | citations=${response.citations.length} | diseases=${allDiseases.length} | write_back=${dbWriteBack} | source=${dataSource}`,
  );

  return {
    final_response: response.text,
    confidence_score: confidence,
    confidence_label: confLabel(confidence),
    citations: response.citations,
    uncertainty_note: response.uncertaintyNote,
    new_knowledge_stored: dbWriteBack,
    db_write_back: dbWriteBack,
    all_diseases: allDiseases,
    session_id: sessionId,
    data_source: dataSource,
  };
}

// ─── Doctor Confirmation → FHIR ─────────────────────────────────────────────

export interface ConfirmResult {
  bundle_id: string;
  session_id: string;
  fhir_version: string;
  bundle_url: string;
  files: { name: string; url: string }[];
  resources_created: Record<string, number>;
  selected_diseases: Array<{
    disease_name: string;
    icd_10_code: string;
    specialty: string;
    symptom_count: number;
    treatment_count: number;
    medication_count: number;
    data_origin: string;
  }>;
}

export async function runDoctorConfirmationAndFhir(
  sessionId: string,
  selectedIcdCodes: string[],
  patientInfo: Record<string, any>,
  vitals: Record<string, any>,
): Promise<ConfirmResult> {
  const session = sessionGet(sessionId);
  if (!session) {
    throw new Error(
      `Session '${sessionId}' not found or expired (TTL=2h). ` +
      "Re-submit symptoms via POST /api/ai/suggest.",
    );
  }

  const allDiseases: DiseasePanelEntry[] = session.all_diseases ?? [];
  const rawQuery: string = session.raw_query ?? "";

  // Filter to doctor-selected only
  const selectedUpper = new Set(selectedIcdCodes.map((s) => s.trim().toUpperCase()));
  const selected = allDiseases.filter((d) =>
    selectedUpper.has((d.icd_10_code ?? "").toUpperCase()),
  );

  if (!selected.length) {
    throw new Error(
      `None of [${selectedIcdCodes.join(", ")}] matched retrieved diseases. ` +
      `Available: [${allDiseases.map((d) => d.icd_10_code).join(", ")}]`,
    );
  }

  console.log(
    `[confirm] Doctor selected ${selected.length}/${allDiseases.length}: ${selected.map((d) => d.disease_name).join(", ")}`,
  );

  // Build FHIR inputs
  const diagnoses = selected.map((d, i) => ({
    disease_name: d.disease_name,
    icd_10_code: d.icd_10_code,
    rank: i + 1,
  }));

  // Deduplicate medications across selected diseases
  const medications: Record<string, any>[] = [];
  const seenMeds = new Set<string>();
  for (const d of selected) {
    for (const med of d.medications ?? []) {
      const name = ((med.generic_name as string) ?? "").toLowerCase();
      if (name && !seenMeds.has(name)) {
        seenMeds.add(name);
        medications.push(med);
      }
    }
  }

  const bundle = generateFhirBundle({
    sessionId,
    patientNameFamily: patientInfo.name_family ?? "Anonymous",
    patientNameGiven: patientInfo.name_given ?? ["Patient"],
    patientGender: patientInfo.gender ?? "unknown",
    chiefComplaint: rawQuery,
    diagnoses,
    patientMrn: patientInfo.mrn,
    patientBirthDate: patientInfo.birth_date,
    patientPhone: patientInfo.phone,
    medications,
    vitals,
    encounterDurationMinutes: patientInfo.encounter_duration_minutes ?? 15,
  });

  const { url: bundleUrl, files } = await saveFhirBundle(bundle, sessionId);

  const byType: Record<string, number> = {};
  for (const entry of bundle.entry ?? []) {
    const rt: string = entry.resource?.resourceType ?? "Unknown";
    byType[rt] = (byType[rt] ?? 0) + 1;
  }

  sessionClear(sessionId);
  console.log(
    `[confirm] FHIR bundle ${bundle.id} saved → Cloudinary | ${JSON.stringify(byType)}`,
  );

  return {
    bundle_id: bundle.id,
    session_id: sessionId,
    fhir_version: "R4",
    bundle_url: bundleUrl,
    files,
    resources_created: byType,
    selected_diseases: selected.map((d) => ({
      disease_name: d.disease_name,
      icd_10_code: d.icd_10_code,
      specialty: d.specialty ?? "",
      symptom_count: (d.symptoms ?? []).length,
      treatment_count: (d.treatments ?? []).length,
      medication_count: (d.medications ?? []).length,
      data_origin: d.data_origin ?? "vector_store",
    })),
  };
}
