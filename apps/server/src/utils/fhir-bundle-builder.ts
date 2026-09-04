/**
 * fhir-bundle-builder.ts -FHIR R4 Bundle generation and local storage.
 * Ported from docs/fhir.py (868 lines).
 */

import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

function shortId(): string {
  return randomUUID().slice(0, 8).toUpperCase();
}

// Cloudinary config (reuses env vars already set for image uploads)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── FHIR Resource Builders ─────────────────────────────────────────────────

export function buildPatient(
  mrn: string,
  family: string,
  given: string[],
  gender: string,
  birthDate?: string | null,
  phone?: string | null,
): Record<string, any> {
  const resource: Record<string, any> = {
    resourceType: "Patient",
    id: mrn,
    meta: {
      profile: ["http://hl7.org/fhir/StructureDefinition/Patient"],
      lastUpdated: nowIso(),
    },
    identifier: [
      {
        use: "usual",
        system: "http://hospital.example.org/mrn",
        value: mrn,
      },
    ],
    name: [
      {
        use: "official",
        family,
        given,
        text: `${given.join(" ")} ${family}`.trim(),
      },
    ],
    gender,
  };

  if (birthDate) resource.birthDate = birthDate;
  if (phone) {
    resource.telecom = [{ system: "phone", value: phone, use: "mobile" }];
  }
  return resource;
}

export function buildEncounter(
  encounterId: string,
  patientMrn: string,
  startTime: Date,
  durationMinutes = 15,
): Record<string, any> {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);
  return {
    resourceType: "Encounter",
    id: encounterId,
    meta: {
      profile: ["http://hl7.org/fhir/StructureDefinition/Encounter"],
      lastUpdated: nowIso(),
    },
    status: "finished",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "VR",
      display: "Virtual",
    },
    type: [
      {
        coding: [
          { system: "http://snomed.info/sct", code: "11429006", display: "Consultation" },
        ],
      },
    ],
    serviceType: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/service-type",
          code: "124",
          display: "General Practice",
        },
      ],
    },
    subject: { reference: `Patient/${patientMrn}` },
    period: {
      start: startTime.toISOString().replace(/\.\d+Z$/, "Z"),
      end: endTime.toISOString().replace(/\.\d+Z$/, "Z"),
    },
    reasonCode: [{ text: "AI-assisted symptom analysis and disease suggestion" }],
  };
}

export function buildCondition(
  conditionId: string,
  patientMrn: string,
  encounterId: string,
  diseaseName: string,
  icd10Code: string,
  rank: number,
): Record<string, any> {
  const verification = rank === 1 ? "provisional" : "unconfirmed";
  return {
    resourceType: "Condition",
    id: conditionId,
    meta: {
      profile: ["http://hl7.org/fhir/StructureDefinition/Condition"],
      lastUpdated: nowIso(),
    },
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: "active",
          display: "Active",
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
          code: verification,
          display: verification.charAt(0).toUpperCase() + verification.slice(1),
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-category",
            code: "encounter-diagnosis",
            display: "Encounter Diagnosis",
          },
        ],
      },
    ],
    code: {
      coding: [
        { system: "http://hl7.org/fhir/sid/icd-10", code: icd10Code, display: diseaseName },
      ],
      text: diseaseName,
    },
    subject: { reference: `Patient/${patientMrn}` },
    encounter: { reference: `Encounter/${encounterId}` },
    recordedDate: nowIso(),
    note: [
      {
        text:
          `AI-suggested differential diagnosis (rank #${rank}). ` +
          "Requires clinical confirmation by a qualified healthcare professional.",
      },
    ],
  };
}

// LOINC vital codes
const VITAL_LOINC: Record<string, [string, string, string, string]> = {
  temperature_f: ["8310-5", "Body temperature", "[degF]", "F"],
  heart_rate_bpm: ["8867-4", "Heart rate", "/min", "bpm"],
  respiratory_rate: ["9279-1", "Respiratory rate", "/min", "breaths/min"],
  oxygen_saturation: ["59408-5", "Oxygen saturation", "%", "%"],
};

export function buildObservations(
  patientMrn: string,
  encounterId: string,
  vitals: Record<string, any>,
  chiefComplaint: string,
): Record<string, any>[] {
  const observations: Record<string, any>[] = [];

  // Vital sign observations
  for (const [key, [loincCode, display, unitCode, unitDisplay]] of Object.entries(VITAL_LOINC)) {
    const value = vitals[key];
    if (value == null) continue;
    observations.push({
      resourceType: "Observation",
      id: `obs-${shortId()}`,
      meta: {
        profile: ["http://hl7.org/fhir/StructureDefinition/vitalsigns"],
        lastUpdated: nowIso(),
      },
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs",
            },
          ],
        },
      ],
      code: {
        coding: [{ system: "http://loinc.org", code: loincCode, display }],
        text: display,
      },
      subject: { reference: `Patient/${patientMrn}` },
      encounter: { reference: `Encounter/${encounterId}` },
      effectiveDateTime: nowIso(),
      valueQuantity: {
        value: parseFloat(value),
        unit: unitDisplay,
        system: "http://unitsofmeasure.org",
        code: unitCode,
      },
    });
  }

  // Blood pressure (two components)
  const bp = vitals.blood_pressure;
  if (bp && String(bp).includes("/")) {
    const parts = String(bp).split("/");
    try {
      const systolic = parseFloat(parts[0].trim());
      const diastolic = parseFloat(parts[1].trim());
      observations.push({
        resourceType: "Observation",
        id: `obs-${shortId()}`,
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "vital-signs",
              },
            ],
          },
        ],
        code: {
          coding: [
            { system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel" },
          ],
        },
        subject: { reference: `Patient/${patientMrn}` },
        encounter: { reference: `Encounter/${encounterId}` },
        effectiveDateTime: nowIso(),
        component: [
          {
            code: {
              coding: [
                {
                  system: "http://loinc.org",
                  code: "8480-6",
                  display: "Systolic blood pressure",
                },
              ],
            },
            valueQuantity: {
              value: systolic,
              unit: "mmHg",
              system: "http://unitsofmeasure.org",
              code: "mm[Hg]",
            },
          },
          {
            code: {
              coding: [
                {
                  system: "http://loinc.org",
                  code: "8462-4",
                  display: "Diastolic blood pressure",
                },
              ],
            },
            valueQuantity: {
              value: diastolic,
              unit: "mmHg",
              system: "http://unitsofmeasure.org",
              code: "mm[Hg]",
            },
          },
        ],
      });
    } catch {
      // skip invalid BP
    }
  }

  // Chief complaint
  if (chiefComplaint) {
    observations.push({
      resourceType: "Observation",
      id: `obs-${shortId()}`,
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "survey",
              display: "Survey",
            },
          ],
        },
      ],
      code: {
        coding: [{ system: "http://loinc.org", code: "46239-0", display: "Chief complaint" }],
        text: "Chief Complaint",
      },
      subject: { reference: `Patient/${patientMrn}` },
      encounter: { reference: `Encounter/${encounterId}` },
      effectiveDateTime: nowIso(),
      valueString: chiefComplaint,
    });
  }

  return observations;
}

export function buildMedicationRequests(
  patientMrn: string,
  encounterId: string,
  medications: Record<string, any>[],
): Record<string, any>[] {
  return medications.map((med) => {
    const name = med.generic_name || med.brand_name || "Unknown";
    const dose = med.dosage_typical || "";
    const drugClass = med.drug_class || "";
    const displayText = dose ? `${name} ${dose}` : name;

    return {
      resourceType: "MedicationRequest",
      id: `medrx-${shortId()}`,
      meta: {
        profile: ["http://hl7.org/fhir/StructureDefinition/MedicationRequest"],
        lastUpdated: nowIso(),
      },
      status: "draft",
      intent: "proposal",
      medicationCodeableConcept: {
        coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", display: displayText }],
        text: displayText,
      },
      subject: { reference: `Patient/${patientMrn}` },
      encounter: { reference: `Encounter/${encounterId}` },
      authoredOn: nowIso(),
      note: [
        {
          text:
            `AI-suggested medication based on differential diagnosis. ` +
            `Drug class: ${drugClass || "Not specified"}. ` +
            "Requires prescriber review and authorization before dispensing.",
        },
      ],
      ...(dose
        ? { dosageInstruction: [{ text: dose }] }
        : {}),
    };
  });
}

// ─── Bundle Assembly ─────────────────────────────────────────────────────────

export interface FhirBundleParams {
  sessionId: string;
  patientNameFamily: string;
  patientNameGiven: string[];
  patientGender: string;
  chiefComplaint: string;
  diagnoses: Array<{ disease_name: string; icd_10_code: string; rank?: number }>;
  patientMrn?: string | null;
  patientBirthDate?: string | null;
  patientPhone?: string | null;
  medications?: Record<string, any>[];
  vitals?: Record<string, any>;
  encounterDurationMinutes?: number;
}

export function generateFhirBundle(params: FhirBundleParams): Record<string, any> {
  const {
    sessionId,
    patientNameFamily,
    patientNameGiven,
    patientGender,
    chiefComplaint,
    diagnoses,
    patientMrn: mrnParam,
    patientBirthDate,
    patientPhone,
    medications = [],
    vitals = {},
    encounterDurationMinutes = 15,
  } = params;

  const mrn = mrnParam || `MRN-${shortId()}`;
  const encounterId = `ENC-${shortId()}`;
  const bundleId = `BUNDLE-${sessionId.slice(0, 8).toUpperCase()}`;
  const now = new Date();

  const entries: Record<string, any>[] = [];

  // 1. Patient
  const patientResource = buildPatient(
    mrn,
    patientNameFamily,
    patientNameGiven,
    patientGender,
    patientBirthDate,
    patientPhone,
  );
  entries.push({
    fullUrl: `urn:uuid:${mrn}`,
    resource: patientResource,
    request: { method: "PUT", url: `Patient/${mrn}` },
  });

  // 2. Encounter
  const encounterResource = buildEncounter(encounterId, mrn, now, encounterDurationMinutes);
  entries.push({
    fullUrl: `urn:uuid:${encounterId}`,
    resource: encounterResource,
    request: { method: "POST", url: "Encounter" },
  });

  // 3. Conditions
  for (const dx of diagnoses) {
    const conditionId = `COND-${shortId()}`;
    const condition = buildCondition(
      conditionId,
      mrn,
      encounterId,
      dx.disease_name || "Unknown",
      dx.icd_10_code || "Z03.89",
      dx.rank ?? 1,
    );
    entries.push({
      fullUrl: `urn:uuid:${conditionId}`,
      resource: condition,
      request: { method: "POST", url: "Condition" },
    });
  }

  // 4. Observations
  const observations = buildObservations(mrn, encounterId, vitals, chiefComplaint);
  for (const obs of observations) {
    entries.push({
      fullUrl: `urn:uuid:${obs.id}`,
      resource: obs,
      request: { method: "POST", url: "Observation" },
    });
  }

  // 5. MedicationRequests
  if (medications.length) {
    const medRequests = buildMedicationRequests(mrn, encounterId, medications);
    for (const mr of medRequests) {
      entries.push({
        fullUrl: `urn:uuid:${mr.id}`,
        resource: mr,
        request: { method: "POST", url: "MedicationRequest" },
      });
    }
  }

  const bundle = {
    resourceType: "Bundle",
    id: bundleId,
    meta: {
      lastUpdated: nowIso(),
      tag: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue",
          code: "SUBSETTED",
          display: "AI-generated -requires clinical review",
        },
      ],
    },
    type: "transaction",
    timestamp: nowIso(),
    entry: entries,
  };

  console.log(
    `[fhir] Bundle generated: id=${bundleId} mrn=${mrn} encounter=${encounterId} entries=${entries.length}`,
  );
  return bundle;
}

// ─── Cloudinary Storage ─────────────────────────────────────────────────────

function uploadJsonToCloudinary(
  json: Record<string, any>,
  publicId: string,
  folder: string,
): Promise<{ url: string; publicId: string }> {
  const content = JSON.stringify(json, null, 2);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "raw",
        format: "json",
        overwrite: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result!.secure_url, publicId: result!.public_id });
      },
    );
    stream.end(Buffer.from(content, "utf-8"));
  });
}

export async function saveFhirBundle(
  bundle: Record<string, any>,
  sessionId: string,
): Promise<{ url: string; files: { name: string; url: string }[] }> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const folder = `voxclinica/emr/${dateStr}/${sessionId}`;

  // Upload full bundle
  const bundleUpload = await uploadJsonToCloudinary(bundle, "bundle", folder);
  const uploadedFiles: { name: string; url: string }[] = [
    { name: "bundle.json", url: bundleUpload.url },
  ];

  // Split by resource type and upload each
  const byType: Record<string, Record<string, any>[]> = {};
  for (const entry of bundle.entry ?? []) {
    const rt: string = entry.resource?.resourceType ?? "Unknown";
    if (!byType[rt]) byType[rt] = [];
    byType[rt].push(entry.resource);
  }

  const resourceFiles: Record<string, string> = {
    Patient: "patient",
    Encounter: "encounter",
    Condition: "conditions",
    Observation: "observations",
    MedicationRequest: "medications",
  };

  for (const [rt, publicId] of Object.entries(resourceFiles)) {
    const resources = byType[rt];
    if (!resources?.length) continue;
    const out = resources.length === 1 ? resources[0] : resources;
    const upload = await uploadJsonToCloudinary(out, publicId, folder);
    uploadedFiles.push({ name: `${publicId}.json`, url: upload.url });
  }

  // Upload manifest
  const manifest = {
    bundle_id: bundle.id,
    session_id: sessionId,
    generated_at: nowIso(),
    fhir_version: "R4",
    resource_counts: Object.fromEntries(
      Object.entries(byType).map(([rt, rs]) => [rt, rs.length]),
    ),
    patient_mrn: byType.Patient?.[0]?.identifier?.[0]?.value ?? "unknown",
    disclaimer:
      "AI-generated EMR. Not a substitute for clinical documentation. " +
      "Requires review and countersignature by licensed clinician.",
  };
  const manifestUpload = await uploadJsonToCloudinary(manifest, "manifest", folder);
  uploadedFiles.push({ name: "manifest.json", url: manifestUpload.url });

  console.log(
    `[fhir] Saved EMR to Cloudinary: ${folder} (${uploadedFiles.length} files)`,
  );

  return { url: bundleUpload.url, files: uploadedFiles };
}
