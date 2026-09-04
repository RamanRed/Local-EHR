import { Patient, Vitals, Condition, Medication, Consult } from "@prisma/client";

export class FHIRMapper {
    /**
     * Maps Prisma Patient to FHIR R4 Patient Resource
     */
    static toPatient(patient: Patient) {
        const nameParts = patient.name.split(" ");
        const family = nameParts.length > 1 ? nameParts.pop() : patient.name;
        const given = nameParts.length > 0 ? nameParts : [patient.name];

        return {
            resourceType: "Patient",
            id: patient.id,
            identifier: [
                {
                    use: "official",
                    system: "http://uidai.gov.in/aadhaar",
                    // The Aadhaar number here might be encrypted depending on when we map it,
                    // usually mapping happens after decryption.
                    value: patient.aadhaarNumber,
                },
            ],
            name: [
                {
                    use: "official",
                    text: patient.name,
                    family: family,
                    given: given,
                },
            ],
            gender: patient.gender ? patient.gender.toLowerCase() : "unknown",
            birthDate: patient.dob ? patient.dob.toISOString().split("T")[0] : undefined,
            telecom: patient.phone
                ? [
                    {
                        system: "phone",
                        value: patient.phone,
                        use: "mobile",
                    },
                ]
                : [],
        };
    }

    /**
     * Maps Prisma Vitals to FHIR R4 Observation Resource (vital-signs)
     */
    static toObservation(vitals: Vitals) {
        const components: any[] = [];

        if (vitals.heartRate) {
            components.push({
                code: {
                    coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }],
                },
                valueQuantity: {
                    value: vitals.heartRate,
                    unit: "beats/min",
                    system: "http://unitsofmeasure.org",
                    code: "/min",
                },
            });
        }

        if (vitals.temperature) {
            components.push({
                code: {
                    coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }],
                },
                valueQuantity: {
                    value: vitals.temperature,
                    unit: "degF", // Assuming Fahrenheit; adjust if Celsius
                    system: "http://unitsofmeasure.org",
                    code: "[degF]",
                },
            });
        }

        if (vitals.weight) {
            components.push({
                code: {
                    coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body Weight" }],
                },
                valueQuantity: {
                    value: vitals.weight,
                    unit: "kg",
                    system: "http://unitsofmeasure.org",
                    code: "kg",
                },
            });
        }

        return {
            resourceType: "Observation",
            id: vitals.id,
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
            subject: {
                reference: `Patient/${vitals.patientId}`,
            },
            effectiveDateTime: vitals.recordedAt.toISOString(),
            component: components.length > 0 ? components : undefined,
        };
    }
}
