# System Implementation

This document outlines the current architecture and features implemented in the project based on the monorepo workspace structure.

## Overview
This is a modern, AI-powered healthcare application built as a monorepo (using `pnpm`). It is divided into three main packages:
- **`apps/server`**: The backend REST/WebSocket API.
- **`apps/web`**: The React-based frontend application.
- **`packages/shared-types`**: Shared TypeScript definitions used across the stack to maintain end-to-end type safety.

---

## 🏗️ Architecture & Tech Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: Node.js, TypeScript, Express (inferred via typical routing patterns)
- **Database**: Prisma ORM (with database migrations, e.g., mapping Aadhaar details)
- **Real-time**: WebSockets (specifically for follow-up calls)
- **AI/ML**: Python (audio transcription) & Node.js AI integrations

---

## 🖥️ Backend Features (`apps/server`)

### Security & Healthcare Compliance
- **HIPAA Logger**: Dedicated logging mechanism for handling protected health information (`hipaa-logger.ts`).
- **PHI Encryption**: Robust encryption capabilities for at-rest and in-transit patient data (`phi-encryption.ts`).
- **FHIR Standards Integration**: 
  - `fhir-bundle-builder.ts`: Constructs FHIR-compliant data bundles.
  - `fhir-mapper.ts` & `fhir.routes.ts`: Maps internal data schema to FHIR resources.

### AI & Pipeline Integrations
- **Entity Extraction**: Automated AI extraction of medical entities (`entity-extraction.ts`).
- **Suggestion Pipeline**: Clinical decision support and intelligent suggestions (`suggest-pipeline.ts`, `suggest.routes.ts`).
- **RAG & Search**: LLM reranking and Vector Store integration (`llm-rerank.ts`, `vector-store.ts`, `external-api-search.ts`).
- **Audio & Transcription**: Speech-to-text integration using Python (`transcribe.py`).
- **LLM/Prompts**: Custom medical and follow-up AI prompts (`medical-prompts.ts`, `followup-prompts.ts`, `openai-helpers.ts`).

### Core Modules (Routes & Services)
- **Authentication**: User authentication and authorization (`auth.routes.ts`, `auth.middleware.ts`).
- **Patient Management**: Patient registration and tracking (`patient.routes.ts`).
- **Consultations & Appointments**: Scheduling and handling virtual or in-person consults (`consult.routes.ts`, `appointment.routes.ts`).
- **Automated Follow-ups**: Follow-up schedulers, services, routes, and WebSocket connectivity for real-time tracking (`followup-call.service.ts`, `followup-scheduler.ts`, `followup-call.ws.ts`).
- **Analytics**: System statistics and dashboards (`stats.routes.ts`).

---

## 🎨 Frontend Features (`apps/web`)

### User Interfaces & Portals
- **Role-based Dashboards**: Dedicated views and components for different actors:
  - `Doctor`
  - `Nurse`
  - `Patient`
- **Shared UI**: Reusable UI primitives (likely shadcn/ui or similar given `components.json` and `ui/` directory).

### Application State & API Integration (Custom Hooks)
- **AI/ML Hooks**: `useAiAnalyze.ts`, `useSuggestPipeline.ts`, `useSpeechRecognition.ts`.
- **Clinical Hooks**: `useConsult.ts`, `useCreatePatient.ts`, `usePatient.ts`, `usePatients.ts`.
- **History Tracking**: `useDoctorHistory.ts`, `useNurseHistory.ts`, `usePatientHistory.ts`.
- **System Hooks**: `useStats.ts`.

---

## 📦 Shared Infrastructure (`packages/shared-types`)
Contains universally shared TypeScript interfaces and enums ensuring both the front-end and back-end speak the exact same data structures, especially regarding Patient Data, AI responses, and API DTOs.