/**
 * vector-store.ts - Step 2: Pinecone init, search, upload, and retrieval.
 * Embeddings are generated locally via Ollama (no OpenAI key required).
 */

import { createHash } from "crypto";
import { Pinecone } from "@pinecone-database/pinecone";
import {
  EMBEDDING_MODEL,
  VECTOR_STORE_NAME,
  MAX_VECTOR_RESULTS,
  MAX_FINAL_CANDIDATES,
  BETA,
  GAMMA,
} from "../utils/medical-prompts.js";
import { cacheGet } from "./session-store.js";

export interface DiseaseCandidate {
  disease_id: string;
  icd_10_code: string;
  disease_name: string;
  description: string;
  specialty: string;
  category: string;
  alternative_names: string[];
  symptoms: any[];
  treatments: any[];
  medications: any[];
  vector_score: number;
  composite_score: number;
  source: string;
  source_url: string;
  raw_doc: Record<string, any>;
  [key: string]: any;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX || "EHRCHAT";
const PINECONE_NAMESPACE  = process.env.PINECONE_NAMESPACE || VECTOR_STORE_NAME;
const PINECONE_DIMENSION  = Number(process.env.PINECONE_DIMENSION || "1024");
const OLLAMA_BASE_URL     = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_EMBED_MODEL  = process.env.OLLAMA_EMBEDDING_MODEL || EMBEDDING_MODEL;

// ─── Pinecone client cache ────────────────────────────────────────────────────

let _pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (_pineconeClient) return _pineconeClient;

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is not set. Add it to your .env file.");
  }

  _pineconeClient = new Pinecone({ apiKey });
  return _pineconeClient;
}

function getPineconeNamespaceIndex(): any {
  const client: any = getPineconeClient();
  const indexFactory = client.index ?? client.Index;
  if (!indexFactory) {
    throw new Error("Pinecone SDK does not expose index()/Index().");
  }
  const index = indexFactory.call(client, PINECONE_INDEX_NAME);
  return index.namespace ? index.namespace(PINECONE_NAMESPACE) : index;
}

// ─── Ollama Embeddings ────────────────────────────────────────────────────────

async function embedText(input: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: input }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama embeddings error ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const embedding: number[] = data.embedding ?? [];

    if (!embedding.length) {
      throw new Error("Ollama returned empty embedding.");
    }

    return embedding;
  } catch (err) {
    console.error("[vs] embedText failed:", err);
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRecordText(rec: Record<string, any>): string {
  const symptomNames = (rec.symptoms || [])
    .map((s: any) => (typeof s === "string" ? s : s?.name))
    .filter(Boolean)
    .join(", ");

  const treatmentNames = (rec.treatments || [])
    .map((t: any) => (typeof t === "string" ? t : t?.name))
    .filter(Boolean)
    .join(", ");

  const medicationNames = (rec.medications || [])
    .map((m: any) => (typeof m === "string" ? m : m?.generic_name || m?.brand_name))
    .filter(Boolean)
    .join(", ");

  return [
    `Disease: ${rec.disease_name || ""}`,
    `ICD-10: ${rec.icd_10_code || ""}`,
    `Specialty: ${rec.specialty || ""}`,
    `Category: ${rec.category || ""}`,
    `Description: ${rec.description || ""}`,
    `Symptoms: ${symptomNames}`,
    `Treatments: ${treatmentNames}`,
    `Medications: ${medicationNames}`,
    `Alternative names: ${(rec.alternative_names || []).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildRecordId(rec: Record<string, any>): string {
  const base = `${rec.icd_10_code || "unknown"}:${rec.disease_name || "unknown"}`;
  const hash = createHash("sha256").update(base).digest("hex").slice(0, 12);
  return `disease-${hash}`;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toMetadata(rec: Record<string, any>): Record<string, string | number | boolean | string[]> {
  return {
    icd_10_code:            String(rec.icd_10_code || ""),
    disease_name:           String(rec.disease_name || ""),
    description:            String(rec.description || rec.confidence_note || ""),
    specialty:              String(rec.specialty || ""),
    category:               String(rec.category || ""),
    source:                 String(rec.source || "pinecone"),
    source_url:             String(rec.source_url || ""),
    alternative_names_json: JSON.stringify(rec.alternative_names || []),
    symptoms_json:          JSON.stringify(rec.symptoms || []),
    treatments_json:        JSON.stringify(rec.treatments || []),
    medications_json:       JSON.stringify(rec.medications || []),
    data_origin:            String(rec.data_origin || "vector_store"),
  };
}

function metadataToCandidate(id: string, score: number, metadata: Record<string, any>): DiseaseCandidate {
  const alternative_names = parseJson<string[]>(metadata.alternative_names_json, []);
  const symptoms          = parseJson<any[]>(metadata.symptoms_json, []);
  const treatments        = parseJson<any[]>(metadata.treatments_json, []);
  const medications       = parseJson<any[]>(metadata.medications_json, []);

  const raw_doc = {
    icd_10_code:     metadata.icd_10_code || "",
    disease_name:    metadata.disease_name || "",
    description:     metadata.description || "",
    specialty:       metadata.specialty || "",
    category:        metadata.category || "",
    alternative_names,
    symptoms,
    treatments,
    medications,
    source:          metadata.source || "pinecone",
    source_url:      metadata.source_url || "",
    data_origin:     metadata.data_origin || "vector_store",
  };

  return {
    disease_id:       id,
    icd_10_code:      raw_doc.icd_10_code,
    disease_name:     raw_doc.disease_name,
    description:      raw_doc.description,
    specialty:        raw_doc.specialty,
    category:         raw_doc.category,
    alternative_names,
    symptoms,
    treatments,
    medications,
    vector_score:     score,
    composite_score:  0,
    source:           raw_doc.source,
    source_url:       raw_doc.source_url,
    raw_doc,
    data_origin:      raw_doc.data_origin,
  };
}

export async function getVectorStoreId(): Promise<string> {
  getPineconeNamespaceIndex();
  return `${PINECONE_INDEX_NAME}:${PINECONE_NAMESPACE}`;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function vectorStoreSearch(
  query: string,
  maxResults = 20,
): Promise<DiseaseCandidate[]> {
  try {
    const namespaceIndex  = getPineconeNamespaceIndex();
    const queryEmbedding  = await embedText(query);

    if (!queryEmbedding.length) {
      console.warn("[vs] Empty query embedding — Ollama may not be running.");
      return [];
    }

    const results = await namespaceIndex.query({
      vector:          queryEmbedding,
      topK:            maxResults,
      includeMetadata: true,
    });

    const hits: DiseaseCandidate[] = [];
    for (const match of results.matches ?? []) {
      const metadata = (match.metadata || {}) as Record<string, any>;
      hits.push(metadataToCandidate(match.id, match.score || 0, metadata));
    }

    console.log(`[vs] Search: ${hits.length} results for '${query.slice(0, 80)}'`);
    return hits;
  } catch (err) {
    console.warn("[vs] Search failed:", err);
    return [];
  }
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function vectorStoreUpload(records: Record<string, any>[]): Promise<number> {
  if (!records.length) return 0;

  let count = 0;

  for (const rec of records) {
    try {
      const namespaceIndex  = getPineconeNamespaceIndex();
      const embeddingInput  = buildRecordText(rec);
      const values          = await embedText(embeddingInput);

      if (!values.length) {
        console.warn("[vs] Skipping upload — empty embedding.");
        continue;
      }

      const vector = {
        id:       buildRecordId(rec),
        values,
        metadata: toMetadata(rec),
      };

      try {
        await namespaceIndex.upsert([vector]);
      } catch {
        await namespaceIndex.upsert({ vectors: [vector] });
      }

      count++;
    } catch (err) {
      const code = rec.icd_10_code || "unknown";
      const name = rec.disease_name || "unknown";
      console.warn(`[vs] Upload failed ${code} (${name}):`, err);
    }
  }

  console.log(`[vs] Uploaded ${count}/${records.length} records.`);
  return count;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const _SNOMED_SUFFIX = new RegExp(
  "\\s*\\((?:finding|disorder|disease|situation|observable entity|" +
  "morphologic abnormality|body structure|procedure|qualifier value|" +
  "symptom|event|clinical finding)\\)\\s*$",
  "i",
);

export function cleanSymptoms(raw: string[]): string[] {
  return raw
    .map((s) => s.replace(_SNOMED_SUFFIX, "").trim().toLowerCase())
    .filter(Boolean);
}

export function symptomHash(symptoms: string[]): string {
  const sorted = [...symptoms].map((s) => s.toLowerCase()).sort().join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}

function scoreHits(hits: DiseaseCandidate[]): DiseaseCandidate[] {
  const scored = hits.map((h) => ({
    ...h,
    composite_score: +(BETA * (h.vector_score ?? 0) + GAMMA).toFixed(4),
  }));
  scored.sort((a, b) => b.composite_score - a.composite_score);
  return scored.slice(0, MAX_FINAL_CANDIDATES);
}

// ─── Step 2: Retrieve from DB ─────────────────────────────────────────────────

export async function runRetrieveFromDb(symptoms: string[]): Promise<DiseaseCandidate[]> {
  if (!symptoms.length) return [];

  const cacheKey = `retrieve:${symptomHash(symptoms)}`;
  const cached   = cacheGet(cacheKey);
  if (cached && (cached as any).candidates) {
    console.log(`[step2] Cache hit: ${(cached as any).candidates.length} candidates.`);
    return (cached as any).candidates;
  }

  const query      = symptoms.join("; ");
  const hits       = await vectorStoreSearch(query, MAX_VECTOR_RESULTS);
  const candidates = scoreHits(hits);
  console.log(`[step2] VS: ${hits.length} hits → ${candidates.length} scored.`);
  return candidates;
}

// Re-export scoreHits for use by external-api-search
export { scoreHits };
