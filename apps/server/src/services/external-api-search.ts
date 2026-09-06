/**
 * external-api-search.ts -Steps 4-6: External API fetch + LLM structuring +
 * Vector Store write-back + re-fetch.
 * Ported from docs/main.py lines 743-1007.
 */

import { openaiChatJson } from "../utils/openai-helpers.js";
import {
  STRUCTURE_PROMPT,
  REQUEST_TIMEOUT,
  RATE_LIMIT_DELAY,
  DB_WRITE_BACK_WAIT_S,
  MAX_VECTOR_RESULTS,
} from "../utils/medical-prompts.js";
import {
  cleanSymptoms,
  vectorStoreSearch,
  vectorStoreUpload,
  scoreHits,
  type DiseaseCandidate,
} from "./vector-store.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── External API Queries ────────────────────────────────────────────────────

async function queryOpenFDA(symptoms: string[]): Promise<Record<string, any>[]> {
  const results: Record<string, any>[] = [];
  try {
    for (const field of ["indications_and_usage", "warnings"]) {
      const query = symptoms.slice(0, 4).join(" ");
      const url = `https://api.fda.gov/drug/label.json?search=${field}:(${encodeURIComponent(query)})&limit=6`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
      if (resp.ok) {
        const data = await resp.json();
        for (const item of (data.results ?? []).slice(0, 6)) {
          const openfda = item.openfda ?? {};
          results.push({
            type: `fda_${field.slice(0, 8)}`,
            brand_name: (openfda.brand_name ?? [""])[0],
            generic_name: (openfda.generic_name ?? [""])[0],
            indications: ((item.indications_and_usage ?? [""])[0] as string).slice(0, 600),
            warnings: ((item.warnings ?? [""])[0] as string).slice(0, 400),
            drug_class: openfda.pharm_class_epc ?? [],
            source: "openfda",
          });
        }
      }
      await sleep(RATE_LIMIT_DELAY);
    }
  } catch (err) {
    console.warn("[api] OpenFDA:", err);
  }
  return results;
}

async function queryPubMed(symptoms: string[]): Promise<Record<string, any>[]> {
  const results: Record<string, any>[] = [];
  const orTerms = symptoms.slice(0, 5).join(" OR ");
  const queryStr = `(${orTerms}) AND (disease OR diagnosis OR syndrome OR infection)`;
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(queryStr)}&retmode=json&retmax=10&sort=relevance`;
    const sr = await fetch(searchUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
    if (!sr.ok) return results;
    const searchData = await sr.json();
    const ids: string[] = searchData.esearchresult?.idlist ?? [];
    if (!ids.length) return results;

    await sleep(RATE_LIMIT_DELAY);

    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.slice(0, 8).join(",")}&rettype=abstract&retmode=xml`;
    const fr = await fetch(fetchUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
    if (!fr.ok) return results;
    const xml = await fr.text();

    const articles = xml.match(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g) ?? [];
    for (const art of articles) {
      const pmidM = art.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const titleM = art.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
      const abstMatches = art.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g) ?? [];
      const jrnlM = art.match(/<Title>([\s\S]*?)<\/Title>/);

      const pmid = pmidM?.[1] ?? "";
      const title = titleM ? titleM[1].replace(/<[^>]+>/g, "").trim() : "";
      const abstract = abstMatches
        .map((a) => a.replace(/<[^>]+>/g, "").trim())
        .join(" ")
        .slice(0, 1200);

      if (title) {
        results.push({
          type: "pubmed_article",
          pmid,
          title,
          abstract,
          journal: jrnlM ? jrnlM[1].trim() : "",
          source: "pubmed",
          source_url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        });
      }
    }
  } catch (err) {
    console.warn("[api] PubMed:", err);
  }
  return results;
}

async function queryMedlinePlus(symptoms: string[]): Promise<Record<string, any>[]> {
  const results: Record<string, any>[] = [];
  const seen = new Set<string>();
  try {
    for (const symptom of symptoms.slice(0, 4)) {
      const url = `https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${encodeURIComponent(symptom)}&retmax=5`;
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        redirect: "follow",
      });
      if (!resp.ok) continue;
      const text = await resp.text();

      const titles = [...text.matchAll(/<content name="title">([\s\S]*?)<\/content>/g)].map(
        (m) => m[1],
      );
      const urls = [...text.matchAll(/<content name="FullUrl">([\s\S]*?)<\/content>/g)].map(
        (m) => m[1],
      );
      const snippets = [
        ...text.matchAll(/<content name="FullSummary">([\s\S]*?)<\/content>/g),
      ].map((m) => m[1]);

      for (let i = 0; i < Math.min(titles.length, 5); i++) {
        const clean = titles[i].replace(/<[^>]+>/g, "").trim();
        if (seen.has(clean.toLowerCase())) continue;
        seen.add(clean.toLowerCase());
        results.push({
          type: "medlineplus_topic",
          title: clean,
          summary: i < snippets.length
            ? snippets[i].replace(/<[^>]+>/g, "").trim().slice(0, 500)
            : "",
          source: "medlineplus",
          source_url: i < urls.length ? urls[i] : "",
        });
      }
      await sleep(RATE_LIMIT_DELAY);
    }
  } catch (err) {
    console.warn("[api] MedlinePlus:", err);
  }
  return results;
}

async function queryICD10(symptoms: string[]): Promise<Record<string, any>[]> {
  const results: Record<string, any>[] = [];
  const seen = new Set<string>();
  try {
    for (const symptom of symptoms.slice(0, 5)) {
      const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(symptom)}&maxList=10`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
      if (!resp.ok) continue;
      const data = await resp.json();
      if (data.length >= 4 && data[3]) {
        for (const entry of (data[3] as string[][]).slice(0, 10)) {
          if (entry.length >= 2 && !seen.has(entry[0])) {
            seen.add(entry[0]);
            results.push({
              type: "icd10_code",
              icd_10_code: entry[0],
              disease_name: entry[1],
              matched_symptom: symptom,
              source: "nih_clinical_tables",
              source_url: `https://icd.who.int/browse10/2019/en#/${entry[0]}`,
            });
          }
        }
      }
      await sleep(RATE_LIMIT_DELAY);
    }
  } catch (err) {
    console.warn("[api] ICD-10:", err);
  }
  return results;
}

export { queryICD10 };

// ─── Steps 4-6 Orchestrator ─────────────────────────────────────────────────

export async function runExternalSearchStoreAndRefetch(
  rawSymptoms: string[],
  rawQuery: string,
  existingCandidates: DiseaseCandidate[],
): Promise<{
  externalRecords: Record<string, any>[];
  candidates: DiseaseCandidate[];
  dbWriteBack: boolean;
}> {
  const symptoms = cleanSymptoms(rawSymptoms);
  console.log("[steps4-6] External search:", symptoms);
  if (!symptoms.length) {
    return { externalRecords: [], candidates: existingCandidates, dbWriteBack: false };
  }

  // Step 4: Fetch from all external APIs in parallel
  const [openfda, pubmed, medlineplus, icd10] = await Promise.allSettled([
    queryOpenFDA(symptoms),
    queryPubMed(symptoms),
    queryMedlinePlus(symptoms),
    queryICD10(symptoms),
  ]);

  const apiData: Record<string, Record<string, any>[]> = {
    openfda: openfda.status === "fulfilled" ? openfda.value : [],
    pubmed: pubmed.status === "fulfilled" ? pubmed.value : [],
    medlineplus: medlineplus.status === "fulfilled" ? medlineplus.value : [],
    icd10: icd10.status === "fulfilled" ? icd10.value : [],
  };

  for (const [src, recs] of Object.entries(apiData)) {
    console.log(`[step4] ${src}: ${recs.length} records`);
  }

  const totalRaw = Object.values(apiData).reduce((s, v) => s + v.length, 0);
  if (totalRaw === 0) {
    console.warn("[step4] All external APIs empty -no write-back.");
    return { externalRecords: [], candidates: existingCandidates, dbWriteBack: false };
  }

  // Step 5: LLM structures raw API data → full disease records
  const sections: string[] = [];
  if (apiData.openfda.length) {
    const trimmed = apiData.openfda.slice(0, 5).map((i) => ({
      brand: i.brand_name,
      generic: i.generic_name,
      indications: ((i.indications as string) ?? "").slice(0, 300),
      drug_class: i.drug_class ?? [],
    }));
    sections.push("=== OpenFDA Drug Labels ===\n" + JSON.stringify(trimmed, null, 1));
  }
  if (apiData.pubmed.length) {
    const trimmed = apiData.pubmed.slice(0, 5).map((i) => ({
      title: i.title,
      abstract: ((i.abstract as string) ?? "").slice(0, 400),
      url: i.source_url,
    }));
    sections.push("=== PubMed Abstracts ===\n" + JSON.stringify(trimmed, null, 1));
  }
  if (apiData.medlineplus.length) {
    const trimmed = apiData.medlineplus.slice(0, 6).map((i) => ({
      title: i.title,
      summary: ((i.summary as string) ?? "").slice(0, 300),
      url: i.source_url,
    }));
    sections.push("=== MedlinePlus Topics ===\n" + JSON.stringify(trimmed, null, 1));
  }
  if (apiData.icd10.length) {
    const trimmed = apiData.icd10.slice(0, 15).map((i) => ({
      code: i.icd_10_code,
      name: i.disease_name,
      matched_on: i.matched_symptom,
    }));
    sections.push("=== ICD-10 Codes ===\n" + JSON.stringify(trimmed, null, 1));
  }

  const result = await openaiChatJson(
    [
      { role: "system", content: STRUCTURE_PROMPT },
      {
        role: "user",
        content:
          `PATIENT DESCRIPTION: ${rawQuery}\n` +
          `EXTRACTED SYMPTOMS: ${symptoms.join(", ")}\n\n` +
          `RAW API DATA:\n${sections.join("\n\n")}\n\n` +
          "Produce 3–5 complete disease records per the schema.",
      },
    ],
    0.1,
    4000,
  );

  const diseases: Record<string, any>[] = result.diseases ?? [];
  console.log(`[step5] LLM structured ${diseases.length} disease records.`);

  if (!diseases.length) {
    console.warn("[step5] LLM returned no records -skipping DB write.");
    return { externalRecords: [], candidates: existingCandidates, dbWriteBack: false };
  }

  // Tag and validate records
  const existingIcds = new Set(
    existingCandidates.map((c) => (c.icd_10_code ?? "").toUpperCase()),
  );
  const allStructured: Record<string, any>[] = [];
  const newRecords: Record<string, any>[] = [];

  for (const d of diseases) {
    if (!d.disease_name || !d.icd_10_code) continue;
    d.validated = true;
    d.indexed_at = new Date().toISOString();
    d.data_origin = "external_api_structured";
    d.composite_score = 0.55;
    allStructured.push(d);
    if (!existingIcds.has((d.icd_10_code as string).toUpperCase())) {
      newRecords.push(d);
    }
  }

  // Step 6a: DB WRITE
  let uploaded = 0;
  if (newRecords.length) {
    uploaded = await vectorStoreUpload(newRecords);
    console.log(`[step6a] DB WRITE: ${uploaded}/${newRecords.length} records uploaded.`);
  } else {
    console.log("[step6a] All diseases already in DB -skipping upload.");
  }

  // Step 6b: DB READ -re-fetch after indexing
  let dbWriteBack = false;
  if (uploaded > 0) {
    console.log(`[step6b] Waiting ${DB_WRITE_BACK_WAIT_S}ms for Vector Store indexing…`);
    await sleep(DB_WRITE_BACK_WAIT_S);

    const query = symptoms.join("; ");
    const freshHits = await vectorStoreSearch(query, MAX_VECTOR_RESULTS);
    const fresh = scoreHits(freshHits);

    if (fresh.length) {
      console.log(`[step6b] DB RE-FETCH: ${fresh.length} fresh candidates from Vector Store.`);
      const freshIcds = new Set(fresh.map((c) => (c.icd_10_code ?? "").toUpperCase()));
      const oldRemainder = existingCandidates.filter(
        (c) => !freshIcds.has((c.icd_10_code ?? "").toUpperCase()),
      );
      return {
        externalRecords: allStructured,
        candidates: [...fresh, ...oldRemainder],
        dbWriteBack: true,
      };
    } else {
      console.warn("[step6b] Re-fetch returned empty -falling back to structured records.");
    }
  }

  // Fallback: use structured records directly
  const merged = [
    ...existingCandidates,
    ...allStructured
      .filter((r) => !existingIcds.has((r.icd_10_code as string).toUpperCase()))
      .map(
        (r) =>
          ({
            disease_id: "",
            icd_10_code: r.icd_10_code ?? "",
            disease_name: r.disease_name ?? "",
            description: r.description ?? "",
            specialty: r.specialty ?? "",
            category: r.category ?? "",
            alternative_names: r.alternative_names ?? [],
            symptoms: r.symptoms ?? [],
            treatments: r.treatments ?? [],
            medications: r.medications ?? [],
            vector_score: 0,
            composite_score: r.composite_score ?? 0.55,
            source: r.source ?? "external_api_structured",
            source_url: r.source_url ?? "",
            raw_doc: r,
            data_origin: "external_api_structured",
          }) as DiseaseCandidate,
      ),
  ];
  return { externalRecords: allStructured, candidates: merged, dbWriteBack };
}
