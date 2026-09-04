import type { JsonObject } from "swagger-ui-express";

const swaggerDocument: JsonObject = {
  openapi: "3.0.3",
  info: {
    title: "SarvaVaidya API",
    version: "1.0.0",
    description: "Role-Based Smart EMR & Diagnostic Assistant API",
  },
  servers: [{ url: "/api", description: "Local dev" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      UserPublic: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { type: "string", enum: ["NURSE", "DOCTOR", "PATIENT"] },
          phone: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          specialization: { type: "string", nullable: true },
          photoUrl: { type: "string", nullable: true },
          dob: { type: "string", format: "date-time", nullable: true },
          gender: { type: "string", nullable: true },
          bloodGroup: { type: "string", nullable: true },
          emergencyContact: { type: "string", nullable: true },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/UserPublic" },
        },
      },
      Vitals: {
        type: "object",
        properties: {
          id: { type: "string" },
          patientId: { type: "string" },
          bloodPressure: { type: "string", nullable: true },
          heartRate: { type: "integer", nullable: true },
          temperature: { type: "number", nullable: true },
          oxygenSat: { type: "integer", nullable: true },
          bloodGlucose: { type: "number", nullable: true },
          weight: { type: "number", nullable: true },
          height: { type: "number", nullable: true },
          symptoms: { type: "array", items: { type: "string" } },
          notes: { type: "string", nullable: true },
          recordedAt: { type: "string", format: "date-time" },
        },
      },
      Patient: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          aadhaarNumber: { type: "string", nullable: true },
          dob: { type: "string", format: "date-time", nullable: true },
          gender: { type: "string" },
          phone: { type: "string", nullable: true },
          bloodGroup: { type: "string", nullable: true },
          emergencyContact: { type: "string", nullable: true },
          photoUrl: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["WAITING", "IN_CONSULT", "CURED", "EMERGENCY"],
          },
          createdBy: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          vitals: {
            nullable: true,
            $ref: "#/components/schemas/Vitals",
          },
        },
      },
      PatientSearchResult: {
        oneOf: [
          {
            type: "object",
            properties: {
              source: { type: "string", enum: ["patient"] },
              patient: { $ref: "#/components/schemas/Patient" },
            },
          },
          {
            type: "object",
            properties: {
              source: { type: "string", enum: ["user"] },
              user: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  dob: { type: "string", format: "date-time", nullable: true },
                  gender: { type: "string", nullable: true },
                  bloodGroup: { type: "string", nullable: true },
                  emergencyContact: { type: "string", nullable: true },
                },
              },
            },
          },
        ],
      },
      IcdCode: {
        type: "object",
        properties: {
          code: { type: "string" },
          description: { type: "string" },
        },
      },
      Appointment: {
        type: "object",
        properties: {
          id: { type: "string" },
          patientId: { type: "string" },
          patient: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              name: { type: "string" },
            },
          },
          doctorId: { type: "string", nullable: true },
          doctorName: { type: "string", nullable: true },
          type: {
            type: "string",
            enum: ["followUpCall", "inClinic", "videoConsultation"],
          },
          reason: {
            type: "string",
            nullable: true,
            enum: ["FollowUp", "FeverCold", "RoutineCheckUp", "PainInjury", "SkinIssues", "DigestiveIssues", "MentalHealth", "Other"],
          },
          symptoms: { type: "string", nullable: true },
          preferredDate: { type: "string", format: "date-time" },
          timeSlot: { type: "string" },
          mobile: { type: "string" },
          status: {
            type: "string",
            enum: ["pending", "confirmed", "completed", "cancelled"],
          },
          roomId: { type: "string", nullable: true },
          videoLink: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      FollowUpCallStructuredFindings: {
        type: "object",
        properties: {
          symptomChanges: { type: "string" },
          medicationAdherence: { type: "string" },
          newSymptoms: { type: "array", items: { type: "string" } },
          urgencyLevel: {
            type: "string",
            enum: ["none", "low", "medium", "high", "critical"],
          },
          keyFindings: { type: "array", items: { type: "string" } },
          patientMood: { type: "string" },
          followUpRecommendation: { type: "string" },
        },
      },
      FollowUpCall: {
        type: "object",
        properties: {
          id: { type: "string" },
          patientId: { type: "string" },
          patient: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              name: { type: "string" },
            },
          },
          consultId: { type: "string" },
          initiatedBy: { type: "string", description: "userId or \"SYSTEM\" for auto-scheduled" },
          status: {
            type: "string",
            enum: ["scheduled", "in_progress", "completed", "failed", "cancelled"],
          },
          transcript: { type: "string", nullable: true, description: "Full conversation transcript (decrypted on read)" },
          summary: { type: "string", nullable: true, description: "AI-generated clinical summary (decrypted on read)" },
          structuredFindings: {
            nullable: true,
            $ref: "#/components/schemas/FollowUpCallStructuredFindings",
          },
          urgencyLevel: {
            type: "string",
            enum: ["none", "low", "medium", "high", "critical"],
          },
          scheduledAt: { type: "string", format: "date-time", nullable: true },
          startedAt: { type: "string", format: "date-time", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          durationSeconds: { type: "integer", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      FollowUpCallListItem: {
        type: "object",
        description: "Follow-up call without transcript (for list views)",
        properties: {
          id: { type: "string" },
          patientId: { type: "string" },
          patient: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
            },
          },
          consultId: { type: "string" },
          initiatedBy: { type: "string" },
          status: {
            type: "string",
            enum: ["scheduled", "in_progress", "completed", "failed", "cancelled"],
          },
          summary: { type: "string", nullable: true },
          structuredFindings: {
            nullable: true,
            $ref: "#/components/schemas/FollowUpCallStructuredFindings",
          },
          urgencyLevel: {
            type: "string",
            enum: ["none", "low", "medium", "high", "critical"],
          },
          scheduledAt: { type: "string", format: "date-time", nullable: true },
          startedAt: { type: "string", format: "date-time", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          durationSeconds: { type: "integer", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Consult: {
        type: "object",
        properties: {
          id: { type: "string" },
          patientId: { type: "string" },
          doctorId: { type: "string" },
          transcript: { type: "string", nullable: true },
          soapSubjective: { type: "string", nullable: true },
          soapObjective: { type: "string", nullable: true },
          soapAssessment: { type: "string", nullable: true },
          soapPlan: { type: "string", nullable: true },
          icdCodes: {
            type: "array",
            nullable: true,
            items: { $ref: "#/components/schemas/IcdCode" },
          },
          patientSummary: { type: "string", nullable: true },
          followUpDate: { type: "string", format: "date-time", nullable: true },
          finalized: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    // ── Health ──
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                },
              },
            },
          },
        },
      },
    },

    // ── Auth ──
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user info",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/UserPublic" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/auth/profile": {
      patch: {
        tags: ["Auth"],
        summary: "Update current user profile",
        description:
          "Update name, phone, email, photoUrl for any role. Doctors can also set specialization. Patients can set dob, gender, bloodGroup, emergencyContact.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string" },
                  specialization: { type: "string", description: "Doctor only" },
                  photoUrl: { type: "string" },
                  dob: { type: "string", format: "date", example: "1992-03-15" },
                  gender: { type: "string", enum: ["Male", "Female", "Other"] },
                  bloodGroup: { type: "string", enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
                  emergencyContact: { type: "string", example: "+91 98765 43210" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/UserPublic" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/auth/aadhaar/send-otp": {
      post: {
        tags: ["Auth"],
        summary: "Send OTP to Aadhaar-linked mobile",
        description:
          "Generates a 6-digit OTP for any valid 12-digit Aadhaar number (works for both existing and new users). Check server console for OTP in dev mode.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["aadhaarNumber"],
                properties: {
                  aadhaarNumber: {
                    type: "string",
                    pattern: "^\\d{12}$",
                    example: "111111111111",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OTP sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
          "400": {
            description: "Invalid Aadhaar number",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/auth/aadhaar/verify-otp": {
      post: {
        tags: ["Auth"],
        summary: "Verify OTP",
        description:
          "Verifies the OTP. If the Aadhaar belongs to an existing user, returns a JWT token. If new, returns `needsOnboarding: true`.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["aadhaarNumber", "otp"],
                properties: {
                  aadhaarNumber: { type: "string", example: "111111111111" },
                  otp: { type: "string", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Either an AuthResponse (existing user) or an onboarding prompt (new user)",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/AuthResponse" },
                    {
                      type: "object",
                      properties: {
                        needsOnboarding: {
                          type: "boolean",
                          example: true,
                        },
                        aadhaarNumber: { type: "string" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Invalid / expired OTP",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/auth/aadhaar/onboard": {
      post: {
        tags: ["Auth"],
        summary: "Complete new patient registration",
        description:
          "Creates a new PATIENT user after OTP verification. Only callable for Aadhaar numbers that have passed OTP verification but have no existing account. Accepts optional health details.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["aadhaarNumber", "name"],
                properties: {
                  aadhaarNumber: { type: "string", example: "222222222222" },
                  name: { type: "string", example: "Rahul Sharma" },
                  dob: { type: "string", format: "date", example: "1992-03-15", description: "Optional date of birth" },
                  gender: { type: "string", enum: ["Male", "Female", "Other"], description: "Optional" },
                  bloodGroup: { type: "string", enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], description: "Optional" },
                  emergencyContact: { type: "string", example: "+91 98765 43210", description: "Optional" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Account created, JWT returned",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "403": {
            description: "Aadhaar not OTP-verified",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "409": {
            description: "Account already exists",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },

    // ── Patients ──
    "/patients/search": {
      get: {
        tags: ["Patients"],
        summary: "Search patient by Aadhaar number",
        description:
          "Looks up a patient by Aadhaar. First checks the Patient table (returning patient with vitals), then the User table (registered but no visit yet). Returns 404 if not found. Requires NURSE or DOCTOR role.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "aadhaar",
            required: true,
            schema: { type: "string", pattern: "^\\d{12}$" },
            description: "12-digit Aadhaar number",
            example: "111111111111",
          },
        ],
        responses: {
          "200": {
            description: "Patient or user found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PatientSearchResult" },
              },
            },
          },
          "400": {
            description: "Invalid Aadhaar number",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "404": {
            description: "No patient found with this Aadhaar",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/patients": {
      get: {
        tags: ["Patients"],
        summary: "List patients",
        description: "Returns all patients, optionally filtered by status. Requires NURSE or DOCTOR role.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "status",
            schema: {
              type: "string",
              enum: ["WAITING", "IN_CONSULT", "CURED", "EMERGENCY"],
            },
            required: false,
            description: "Filter by patient status",
          },
        ],
        responses: {
          "200": {
            description: "List of patients",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Patient" },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "403": {
            description: "Insufficient permissions",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
      post: {
        tags: ["Patients"],
        summary: "Create a patient with optional vitals",
        description: "Nurse-only. Creates a patient record, optionally with initial vitals and Aadhaar link.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "gender"],
                properties: {
                  name: { type: "string", example: "Priya Patel" },
                  gender: { type: "string", example: "Female" },
                  phone: { type: "string", example: "9876543210" },
                  dob: { type: "string", format: "date", example: "1992-03-15" },
                  aadhaarNumber: { type: "string", example: "111111111111", description: "12-digit Aadhaar for future lookups" },
                  bloodGroup: { type: "string", enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
                  emergencyContact: { type: "string", example: "+91 98765 43210" },
                  status: {
                    type: "string",
                    enum: ["WAITING", "EMERGENCY"],
                    default: "WAITING",
                  },
                  vitals: {
                    type: "object",
                    properties: {
                      bloodPressure: { type: "string", example: "120/80" },
                      heartRate: { type: "integer", example: 72 },
                      temperature: { type: "number", example: 98.6 },
                      oxygenSat: { type: "integer", example: 98 },
                      bloodGlucose: { type: "number", example: 110 },
                      weight: { type: "number", example: 65 },
                      height: { type: "number", example: 170 },
                      symptoms: {
                        type: "array",
                        items: { type: "string" },
                        example: ["headache", "fever"],
                      },
                      notes: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Patient created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Patient" },
              },
            },
          },
          "400": {
            description: "Missing required fields",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/patients/{id}": {
      get: {
        tags: ["Patients"],
        summary: "Get patient by ID",
        description: "Returns a single patient with vitals and consults. Requires NURSE or DOCTOR role.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Patient details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Patient" },
              },
            },
          },
          "404": {
            description: "Patient not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
      patch: {
        tags: ["Patients"],
        summary: "Update patient demographics",
        description: "Nurse-only. Update a patient's name, dob, gender, phone, blood group, or emergency contact.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  dob: { type: "string", format: "date", example: "1992-03-15" },
                  gender: { type: "string", enum: ["Male", "Female", "Other"] },
                  phone: { type: "string" },
                  bloodGroup: { type: "string", enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
                  emergencyContact: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated patient",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Patient" },
              },
            },
          },
          "400": {
            description: "No fields to update",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/patients/{id}/status": {
      patch: {
        tags: ["Patients"],
        summary: "Update patient status",
        description: "Requires NURSE or DOCTOR role.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["WAITING", "IN_CONSULT", "CURED", "EMERGENCY"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated patient",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Patient" },
              },
            },
          },
          "400": {
            description: "Invalid status",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/patients/{id}/consults": {
      get: {
        tags: ["Patients"],
        summary: "List consults for a patient",
        description: "Requires DOCTOR or PATIENT role.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "List of consults",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Consult" },
                },
              },
            },
          },
        },
      },
    },

    // ── Consults ──
    "/consults": {
      post: {
        tags: ["Consults"],
        summary: "Create a new consult",
        description: "Doctor-only. Sets the patient status to IN_CONSULT.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patientId"],
                properties: {
                  patientId: { type: "string" },
                  transcript: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Consult created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Consult" },
              },
            },
          },
          "400": {
            description: "Missing patientId",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/consults/{id}": {
      get: {
        tags: ["Consults"],
        summary: "Get consult by ID",
        description: "Requires DOCTOR or PATIENT role.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Consult details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Consult" },
              },
            },
          },
          "404": {
            description: "Consult not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
      patch: {
        tags: ["Consults"],
        summary: "Update consult (SOAP, ICD, finalize)",
        description:
          "Doctor-only. Update any combination of SOAP notes, ICD codes, patient summary, follow-up date, or finalize. Finalizing sets the patient status to COMPLETED.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  transcript: { type: "string" },
                  soapSubjective: { type: "string" },
                  soapObjective: { type: "string" },
                  soapAssessment: { type: "string" },
                  soapPlan: { type: "string" },
                  icdCodes: {
                    type: "array",
                    items: { $ref: "#/components/schemas/IcdCode" },
                  },
                  patientSummary: { type: "string" },
                  followUpDate: { type: "string", format: "date-time" },
                  finalized: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated consult",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Consult" },
              },
            },
          },
        },
      },
    },

    // ── AI ──
    "/ai/analyze": {
      post: {
        tags: ["AI"],
        summary: "Analyze symptoms and generate SOAP + ICD suggestions",
        description:
          "Doctor-only. Uses Google Gemini AI to analyze a consultation transcript and/or symptoms list with optional vitals. Returns SOAP notes and ICD-10 code suggestions. Falls back to keyword-matching if Gemini is unavailable.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  transcript: { type: "string", example: "Patient complains of headache and fever for 2 days" },
                  symptoms: {
                    type: "array",
                    items: { type: "string" },
                    example: ["headache", "fever"],
                  },
                  vitals: {
                    type: "object",
                    properties: {
                      bloodPressure: { type: "string" },
                      heartRate: { type: "integer" },
                      temperature: { type: "number" },
                      oxygenSat: { type: "integer" },
                      bloodGlucose: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "AI analysis result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    soap: {
                      type: "object",
                      properties: {
                        subjective: { type: "string" },
                        objective: { type: "string" },
                        assessment: { type: "string" },
                        plan: { type: "string" },
                      },
                    },
                    icdSuggestions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/IcdCode" },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "No transcript or symptoms provided",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },

    // ── Appointments ──
    "/appointments": {
      post: {
        tags: ["Appointments"],
        summary: "Create an appointment",
        description:
          "Patient-only. Creates a new appointment. If type is videoConsultation, a roomId and videoLink are auto-generated.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patientId", "type", "preferredDate", "timeSlot", "mobile"],
                properties: {
                  patientId: { type: "string" },
                  type: {
                    type: "string",
                    enum: ["followUpCall", "inClinic", "videoConsultation"],
                  },
                  reason: {
                    type: "string",
                    enum: ["FollowUp", "FeverCold", "RoutineCheckUp", "PainInjury", "SkinIssues", "DigestiveIssues", "MentalHealth", "Other"],
                  },
                  symptoms: { type: "string", example: "Headache, mild fever" },
                  preferredDate: { type: "string", format: "date-time", example: "2026-02-25T00:00:00.000Z" },
                  timeSlot: { type: "string", example: "10:00 AM - 10:30 AM" },
                  mobile: { type: "string", example: "9876543210" },
                  doctorId: { type: "string", description: "Optional preferred doctor" },
                  doctorName: { type: "string", description: "Optional preferred doctor name" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Appointment created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Appointment" },
              },
            },
          },
          "400": {
            description: "Missing required fields",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
      get: {
        tags: ["Appointments"],
        summary: "List all appointments",
        description: "Doctor-only. Lists all appointments, optionally filtered by status or date.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "status",
            schema: {
              type: "string",
              enum: ["pending", "confirmed", "completed", "cancelled"],
            },
            required: false,
            description: "Filter by appointment status",
          },
          {
            in: "query",
            name: "date",
            schema: { type: "string", format: "date" },
            required: false,
            description: "Filter by date (YYYY-MM-DD)",
          },
        ],
        responses: {
          "200": {
            description: "List of appointments",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Appointment" },
                },
              },
            },
          },
        },
      },
    },
    "/appointments/my": {
      get: {
        tags: ["Appointments"],
        summary: "List patient's own appointments",
        description: "Patient-only. Returns appointments linked to the authenticated patient.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of patient's appointments",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Appointment" },
                },
              },
            },
          },
        },
      },
    },
    "/appointments/{id}": {
      get: {
        tags: ["Appointments"],
        summary: "Get appointment by ID",
        description: "Requires DOCTOR or PATIENT role.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Appointment details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Appointment" },
              },
            },
          },
          "404": {
            description: "Appointment not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
      patch: {
        tags: ["Appointments"],
        summary: "Update appointment",
        description: "Doctor-only. Update status, assign doctorId/doctorName.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["pending", "confirmed", "completed", "cancelled"],
                  },
                  doctorId: { type: "string" },
                  doctorName: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated appointment",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Appointment" },
              },
            },
          },
        },
      },
    },
    "/appointments/{id}/status": {
      patch: {
        tags: ["Appointments"],
        summary: "Quick status update",
        description: "Requires DOCTOR or PATIENT role. Update only the appointment status.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["pending", "confirmed", "completed", "cancelled"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated appointment",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Appointment" },
              },
            },
          },
          "400": {
            description: "Missing status",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },

    // ── Follow-Up Calls ──
    "/followup-calls/initiate": {
      post: {
        tags: ["Follow-Up Calls"],
        summary: "Initiate a follow-up call",
        description:
          "Creates a new follow-up call record for a patient's consult. Requires DOCTOR or NURSE role. Validates that no active call (scheduled/in_progress) already exists for the consult.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patientId", "consultId"],
                properties: {
                  patientId: { type: "string" },
                  consultId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Follow-up call created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FollowUpCall" },
              },
            },
          },
          "400": {
            description: "Missing required fields",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "404": {
            description: "Patient or consult not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "409": {
            description: "Active follow-up call already exists for this consult",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    callId: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/followup-calls": {
      get: {
        tags: ["Follow-Up Calls"],
        summary: "List follow-up calls",
        description:
          "Returns follow-up calls with optional filters. Transcript is excluded (use GET by ID for full detail). Summary and structured findings are included. Requires DOCTOR or NURSE role.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "patientId",
            schema: { type: "string" },
            required: false,
            description: "Filter by patient ID",
          },
          {
            in: "query",
            name: "status",
            schema: {
              type: "string",
              enum: ["scheduled", "in_progress", "completed", "failed", "cancelled"],
            },
            required: false,
            description: "Filter by call status",
          },
          {
            in: "query",
            name: "urgencyLevel",
            schema: {
              type: "string",
              enum: ["none", "low", "medium", "high", "critical"],
            },
            required: false,
            description: "Filter by urgency level",
          },
        ],
        responses: {
          "200": {
            description: "List of follow-up calls",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/FollowUpCallListItem" },
                },
              },
            },
          },
        },
      },
    },
    "/followup-calls/{id}": {
      get: {
        tags: ["Follow-Up Calls"],
        summary: "Get follow-up call detail",
        description:
          "Returns full follow-up call detail including decrypted transcript and summary. Requires DOCTOR or NURSE role.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Follow-up call detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FollowUpCall" },
              },
            },
          },
          "404": {
            description: "Follow-up call not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/followup-calls/{id}/cancel": {
      patch: {
        tags: ["Follow-Up Calls"],
        summary: "Cancel a scheduled follow-up call",
        description:
          "Cancels a follow-up call. Only calls with status \"scheduled\" can be cancelled. Requires DOCTOR or NURSE role.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Cancelled follow-up call",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FollowUpCall" },
              },
            },
          },
          "400": {
            description: "Call cannot be cancelled (not in scheduled status)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "404": {
            description: "Follow-up call not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },

    // ── Stats ──
    "/stats/nurse": {
      get: {
        tags: ["Stats"],
        summary: "Nurse dashboard stats",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Nurse stats",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalPatients: { type: "integer" },
                    waiting: { type: "integer" },
                    emergency: { type: "integer" },
                    completedToday: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/stats/doctor": {
      get: {
        tags: ["Stats"],
        summary: "Doctor dashboard stats",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Doctor stats",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    waiting: { type: "integer" },
                    inConsult: { type: "integer" },
                    completedToday: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/stats/patient": {
      get: {
        tags: ["Stats"],
        summary: "Patient portal stats",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Patient stats",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalVisits: { type: "integer" },
                    upcomingFollowUps: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: "Health", description: "Server health" },
    { name: "Auth", description: "Aadhaar OTP authentication, onboarding & profile management" },
    { name: "Patients", description: "Patient CRUD & Aadhaar lookup" },
    { name: "Consults", description: "Consultation management" },
    { name: "AI", description: "Gemini AI-powered diagnostic analysis (with keyword-matching fallback)" },
    { name: "Appointments", description: "Appointment booking & video consultation management" },
    { name: "Follow-Up Calls", description: "AI-powered follow-up call management. Browser/app mode — WebSocket at ws://host/ws/followup-call/:callId?token=JWT for bidirectional audio relay." },
    { name: "Stats", description: "Dashboard statistics" },
  ],
};

export default swaggerDocument;
