<![CDATA[# SarvaVaidya — AI-Powered Local EHR System

> **SarvaVaidya** (meaning "Universal Healer") is a full-stack, AI-powered Electronic Health Record (EHR) system designed for small clinics and rural healthcare setups. It features role-based workflows for **Nurses**, **Doctors**, and **Patients**, real-time video consultations, AI-driven clinical decision support, FHIR-compliant data export, and automated follow-up calls.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [Frontend Application](#frontend-application)
- [AI & ML Pipeline](#ai--ml-pipeline)
- [Healthcare Compliance](#healthcare-compliance)
- [Key Design Decisions](#key-design-decisions)
- [Common Modification Scenarios](#common-modification-scenarios)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                             │
│                  React 19 + Vite + Tailwind CSS                     │
│          Zustand (auth state) · Axios (HTTP) · WebSocket            │
└────────────────────────┬───────────────┬────────────────────────────┘
                         │  HTTP /api/*  │  WS /ws/*
                         ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Backend (Express 5)                              │
│        JWT Auth · Role Middleware · Swagger Docs at /docs           │
│                                                                     │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────────┐  │
│  │  Routes   │ │ Services  │ │  Utils   │ │  Middleware           │  │
│  │ (12 files)│ │(13 files) │ │(5 files) │ │  auth.middleware.ts   │  │
│  └──────────┘ └───────────┘ └──────────┘ └──────────────────────┘  │
│                         │                                           │
│           ┌─────────────┼─────────────┐                             │
│           ▼             ▼             ▼                             │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│     │ Prisma   │  │ AI APIs  │  │ Pinecone │                      │
│     │ (SQLite) │  │ Gemini / │  │ Vector   │                      │
│     │          │  │ OpenAI   │  │ Store    │                      │
│     └──────────┘  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

The application is a **pnpm monorepo** with three packages:

| Package | Path | Purpose |
|---|---|---|
| `@vox/server` | `apps/server/` | Express 5 REST API + WebSocket server |
| `@vox/web` | `apps/web/` | React 19 SPA (Vite) |
| `@vox/shared-types` | `packages/shared-types/` | Shared TypeScript interfaces & enums |

---

## Tech Stack

### Backend (`apps/server`)
| Category | Technology |
|---|---|
| Runtime | Node.js + TypeScript (tsx for dev) |
| Framework | Express 5 |
| ORM | Prisma (SQLite for local dev, PostgreSQL-ready) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| AI — Primary | Google Gemini (`@google/genai`) |
| AI — Secondary | OpenAI (embeddings, speech) |
| Vector DB | Pinecone (`@pinecone-database/pinecone`) |
| Real-time | WebSocket (`ws`) |
| File Upload | Multer → Cloudinary |
| API Docs | Swagger UI Express |
| Transcription | Python (Whisper / Qwen2-Audio via Ollama) |

### Frontend (`apps/web`)
| Category | Technology |
|---|---|
| Framework | React 19 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3.4 + tailwindcss-animate |
| State | Zustand 5 |
| Routing | React Router DOM 7 |
| Forms | React Hook Form + Zod validation |
| HTTP Client | Axios |
| UI Primitives | Radix UI (Dialog, Label, Slot, Separator) |
| Icons | Lucide React |
| Video Calls | ZegoCloud UIKit Prebuilt |
| Date Utils | date-fns |

### Shared (`packages/shared-types`)
- Pure TypeScript type definitions (no runtime dependencies)
- Consumed by both `@vox/server` and `@vox/web` via `workspace:*`

---

## Monorepo Structure

```
Local-EHR/
├── apps/
│   ├── server/                          # ── Backend API ──
│   │   ├── prisma/
│   │   │   ├── schema.prisma            # Database schema (SQLite)
│   │   │   ├── migrations/              # Prisma migration history
│   │   │   └── dev.db                   # Local SQLite database file
│   │   ├── src/
│   │   │   ├── index.ts                 # Express app entry point, route mounting, server startup
│   │   │   ├── seed.ts                  # Database seeder (demo users, patients, appointments)
│   │   │   ├── swagger.ts               # OpenAPI/Swagger spec (auto-served at /docs)
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts            # Singleton Prisma client instance
│   │   │   ├── middleware/
│   │   │   │   └── auth.middleware.ts    # JWT verification + role-based access control
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts       # Aadhaar OTP login, onboarding, profile CRUD
│   │   │   │   ├── patient.routes.ts    # Patient CRUD, search, status management, revisits
│   │   │   │   ├── consult.routes.ts    # Consultation lifecycle (create → SOAP → finalize)
│   │   │   │   ├── ai.routes.ts         # AI analysis, transcription, summarization
│   │   │   │   ├── suggest.routes.ts    # Disease suggestion pipeline (symptom → ICD → treatment)
│   │   │   │   ├── appointment.routes.ts# Appointment booking, listing, status updates
│   │   │   │   ├── followup.routes.ts   # Follow-up scheduling and tracking
│   │   │   │   ├── followup-call.routes.ts  # Follow-up call management (REST)
│   │   │   │   ├── followup-call.ws.ts  # Follow-up call real-time WebSocket handler
│   │   │   │   ├── fhir.routes.ts       # FHIR R4 bundle export endpoint
│   │   │   │   ├── stats.routes.ts      # Dashboard statistics (nurse/doctor/patient)
│   │   │   │   └── upload.routes.ts     # Image upload (Cloudinary)
│   │   │   ├── services/
│   │   │   │   ├── suggest-pipeline.ts  # Multi-stage AI suggestion engine
│   │   │   │   ├── vector-store.ts      # Pinecone/OpenAI vector embeddings & search
│   │   │   │   ├── external-api-search.ts # External medical API integration
│   │   │   │   ├── llm-rerank.ts        # LLM-based result reranking
│   │   │   │   ├── entity-extraction.ts # Medical entity extraction from text
│   │   │   │   ├── confidence-gate.ts   # Confidence threshold filtering
│   │   │   │   ├── response-generator.ts# AI response formatting
│   │   │   │   ├── followup-call.service.ts # Follow-up call orchestration with Gemini Live
│   │   │   │   ├── followup-scheduler.ts# Automated follow-up scheduling (interval-based)
│   │   │   │   ├── session-store.ts     # In-memory session store for AI pipeline
│   │   │   │   ├── hipaa-logger.ts      # HIPAA-compliant audit logging
│   │   │   │   ├── phi-encryption.ts    # PHI encryption/decryption utilities
│   │   │   │   └── transcribe.py        # Python speech-to-text script (Whisper/Qwen2)
│   │   │   └── utils/
│   │   │       ├── medical-prompts.ts   # System prompts for medical AI analysis
│   │   │       ├── followup-prompts.ts  # System prompts for follow-up AI calls
│   │   │       ├── fhir-bundle-builder.ts # FHIR R4 Bundle construction utilities
│   │   │       ├── fhir-mapper.ts       # Internal schema → FHIR resource mapper
│   │   │       └── openai-helpers.ts    # OpenAI client initialization helpers
│   │   ├── .env.example                 # Environment variable template
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                             # ── Frontend SPA ──
│       ├── src/
│       │   ├── App.tsx                  # Root router — all page routes defined here
│       │   ├── main.tsx                 # ReactDOM entry point
│       │   ├── index.css                # Global styles (Tailwind directives + custom)
│       │   ├── vite-env.d.ts            # Vite type declarations
│       │   ├── components/
│       │   │   ├── auth/                # Login UI (AuthLayout, RoleSelector)
│       │   │   ├── doctor/              # Doctor-specific components (10 files)
│       │   │   ├── nurse/               # Nurse-specific components (6 files)
│       │   │   ├── patient/             # Patient-specific components (2 files)
│       │   │   ├── shared/              # Cross-role components (16 files)
│       │   │   └── ui/                  # Base UI primitives (13 shadcn/ui components)
│       │   ├── hooks/                   # Custom React hooks (12 files)
│       │   ├── pages/
│       │   │   ├── auth/                # AadhaarLoginPage
│       │   │   ├── doctor/              # 7 pages (Dashboard, Consult, History, etc.)
│       │   │   ├── nurse/               # 4 pages (Dashboard, AddPatient, EditPatient, History)
│       │   │   ├── patient/             # 2 pages (Portal, History)
│       │   │   └── shared/              # 3 pages (FollowUpList, Settings, PublicVideoRoom)
│       │   ├── services/
│       │   │   └── api.ts               # Axios API client (all backend endpoints)
│       │   ├── store/
│       │   │   └── index.ts             # Zustand auth store
│       │   └── lib/
│       │       ├── mock-data.ts         # UI development mock data
│       │       └── utils.ts             # cn() utility (clsx + tailwind-merge)
│       ├── public/                      # Static assets
│       ├── .env.example                 # Frontend env template (ZegoCloud keys)
│       ├── components.json              # shadcn/ui configuration
│       ├── tailwind.config.ts           # Tailwind theme customization
│       ├── vite.config.ts               # Vite config (proxy, aliases)
│       ├── postcss.config.js
│       └── package.json
│
├── packages/
│   └── shared-types/                    # ── Shared Type Definitions ──
│       ├── src/
│       │   └── index.ts                 # All TypeScript interfaces & type aliases
│       ├── package.json
│       └── tsconfig.json
│
├── docker-compose.yml                   # PostgreSQL 16 (optional, for production)
├── migrateToSqlite.js                   # Script to convert Prisma schema from PG → SQLite
├── pnpm-workspace.yaml                  # Monorepo workspace definition
├── tsconfig.base.json                   # Shared TypeScript compiler options
├── package.json                         # Root package (scripts, dev dependencies)
├── pnpm-lock.yaml
└── .gitignore
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | ≥ 18 | ES2022 target |
| **pnpm** | ≥ 10.17 | Specified in `packageManager` field |
| **Python 3** | ≥ 3.9 | Only needed for audio transcription features |
| **Docker** | Latest | Only if using PostgreSQL (optional for dev) |

---

## Getting Started

### 1. Clone & Install

```bash
git clone <repository-url>
cd Local-EHR
pnpm install
```

### 2. Configure Environment

```bash
# Server
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env with your API keys

# Web (only needed for video calls)
cp apps/web/.env.example apps/web/.env
```

### 3. Initialize Database

```bash
# Generate Prisma client
cd apps/server
pnpm db:generate

# Push schema to SQLite (creates dev.db)
pnpm db:push

# Seed demo data
pnpm db:seed
```

### 4. Run Development Servers

```bash
# From the root directory — starts both server and web concurrently
pnpm dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/docs |
| Health Check | http://localhost:3001/api/health |

### 5. Demo Login Credentials (Aadhaar Numbers)

| Role | Aadhaar Number |
|---|---|
| Doctor | `111111111111` |
| Nurse | `000000000000` |
| Patient | `222222222222` or `333333333333` |

> **Note**: The app uses a simulated Aadhaar OTP flow. Any 6-digit OTP will work in dev mode.

---

## Environment Variables

### Server (`apps/server/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Prisma connection string. Default: `file:./prisma/dev.db` (SQLite) |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens |
| `PORT` | ❌ | Server port (default: `3001`) |
| `NODE_ENV` | ❌ | `dev` or `production` |
| `GEMINI_API_KEY` | ⚡ | Google Gemini API key (required for AI features) |
| `OPENAI_API_KEY` | ⚡ | OpenAI key (vector store embeddings) |
| `OPENAI_API_SPEECH_KEY` | ⚡ | OpenAI key (speech-to-text) |
| `OPENAI_VECTOR_STORE_ID` | ⚡ | OpenAI Vector Store ID |
| `PINECONE_API_KEY` | ⚡ | Pinecone API key (vector search) |
| `PINECONE_INDEX` | ⚡ | Pinecone index name (default: `quickstart`) |
| `PINECONE_NAMESPACE` | ⚡ | Pinecone namespace (default: `medical_ai_diseases`) |
| `PINECONE_DIMENSION` | ⚡ | Embedding dimension (default: `1536`) |
| `HF_API_TOKEN` | ❌ | Hugging Face API token |
| `CLOUDINARY_CLOUD_NAME` | ❌ | Cloudinary cloud name (image uploads) |
| `CLOUDINARY_API_KEY` | ❌ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ❌ | Cloudinary API secret |
| `PYTHON_EXECUTABLE` | ❌ | Path to Python binary (for transcription) |
| `OLLAMA_AUDIO_MODEL` | ❌ | Ollama audio model (default: `qwen2-audio`) |
| `OLLAMA_WHISPER_MODEL` | ❌ | Ollama whisper model |
| `FRONTEND_URL` | ❌ | Frontend URL (for dev tunnel / CORS) |

> ⚡ = Required for AI/ML features to work; app runs without them but AI endpoints will fail.

### Web (`apps/web/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_ZEGOCLOUD_APP_ID` | ❌ | ZegoCloud App ID (video calls) |
| `VITE_ZEGOCLOUD_SERVER_SECRET` | ❌ | ZegoCloud Server Secret |

---

## Database

### Current: SQLite (Local Development)

The app uses **SQLite** via Prisma for zero-config local development. The database file lives at `apps/server/prisma/dev.db`.

### Production-Ready: PostgreSQL

A `docker-compose.yml` is provided for PostgreSQL:

```bash
docker compose up -d
# Then update DATABASE_URL in .env:
# DATABASE_URL="postgresql://sarvavaidya:sarvavaidya@localhost:5435/sarvavaidya"
```

> **Note**: Use `migrateToSqlite.js` at the root to convert the Prisma schema between PostgreSQL enums/arrays and SQLite-compatible strings. Run it **before** `prisma generate` when switching databases.

### Schema Overview (10 Models)

| Model | Purpose | Key Relations |
|---|---|---|
| `User` | Authentication entity (Doctor / Nurse / Patient) | Identified by unique Aadhaar number |
| `Patient` | Clinical patient record | → Vitals, Consults, Conditions, Medications, Appointments, FollowUps |
| `Vitals` | Patient vital signs snapshot | → Patient (1:1) |
| `Consult` | Doctor consultation record (SOAP notes) | → Patient, → Medications, → FollowUpCalls |
| `Condition` | ICD-coded clinical conditions | → Patient |
| `Medication` | Prescribed medications | → Patient, → Consult |
| `Appointment` | Scheduled appointments (in-clinic, video, follow-up call) | → Patient |
| `FollowUp` | Follow-up tracking between consults | → Patient, → Consults (fulfilled by) |
| `FollowUpCall` | AI-powered follow-up call records | → Patient, → Consult |
| `AuditLog` | HIPAA-compliant audit trail | Standalone (userId reference) |

### Key Enums

| Enum | Values |
|---|---|
| `Role` | `NURSE`, `DOCTOR`, `PATIENT` |
| `PatientStatus` | `WAITING`, `IN_CONSULT`, `UNDER_TREATMENT`, `CURED`, `EMERGENCY` |
| `FollowUpStatus` | `PENDING`, `COMPLETED`, `CANCELLED` |
| `AppointmentType` | `followUpCall`, `inClinic`, `videoConsultation` |
| `AppointmentStatus` | `pending`, `confirmed`, `completed`, `cancelled` |
| `FollowUpCallStatus` | `scheduled`, `in_progress`, `completed`, `failed`, `cancelled` |
| `UrgencyLevel` | `none`, `low`, `medium`, `high`, `critical` |

### Database Commands

```bash
cd apps/server

pnpm db:generate     # Generate Prisma client from schema
pnpm db:push         # Push schema to database (no migration)
pnpm db:migrate      # Create and run migration
pnpm db:seed         # Seed demo data (tsx src/seed.ts)
```

---

## API Reference

All endpoints are served under `/api`. Protected routes require `Authorization: Bearer <jwt>`.

Interactive Swagger docs available at **http://localhost:3001/docs** when the server is running.

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/aadhaar/send-otp` | ❌ | Send OTP to Aadhaar number |
| `POST` | `/auth/aadhaar/verify-otp` | ❌ | Verify OTP → returns JWT or `needsOnboarding` |
| `POST` | `/auth/aadhaar/onboard` | ❌ | Complete onboarding for new users |
| `GET` | `/auth/me` | ✅ | Get current authenticated user profile |
| `PATCH` | `/auth/profile` | ✅ | Update user profile |

### Patients (`/api/patients`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/patients` | ✅ | List patients (optional `?status=` filter) |
| `GET` | `/patients/:id` | ✅ | Get patient by ID (includes vitals) |
| `GET` | `/patients/search?aadhaar=` | ✅ | Search by Aadhaar (checks Patient + User tables) |
| `POST` | `/patients` | ✅ | Create patient with optional vitals |
| `PATCH` | `/patients/:id` | ✅ | Update patient info and vitals |
| `PATCH` | `/patients/:id/status` | ✅ | Update patient status |
| `POST` | `/patients/:id/revisit` | ✅ | Re-register returning patient with fresh vitals |
| `GET` | `/patients/:patientId/consults` | ✅ | Get all consults for a patient |

### Consultations (`/api/consults`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/consults` | ✅ | Create new consultation |
| `GET` | `/consults` | ✅ | List doctor's consultations |
| `GET` | `/consults/:id` | ✅ | Get consultation by ID |
| `PATCH` | `/consults/:id` | ✅ | Update SOAP notes, ICD codes, prescription, etc. |

### AI Endpoints (`/api/ai`) — Doctor-only

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ai/analyze` | AI analysis of transcript + symptoms + vitals |
| `POST` | `/ai/transcribe` | Speech-to-text (audio → text) |
| `POST` | `/ai/summarize` | Generate patient-friendly summary from SOAP |
| `POST` | `/ai/suggest` | Start disease suggestion pipeline from symptoms |
| `POST` | `/ai/suggest/confirm` | Confirm ICD selection → get treatment plan |

### Appointments (`/api/appointments`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/appointments` | ✅ | Book appointment |
| `GET` | `/appointments` | ✅ | List appointments (filterable by status, date) |
| `GET` | `/appointments/my` | ✅ | Get current user's appointments |
| `GET` | `/appointments/:id` | ✅ | Get appointment by ID |
| `PATCH` | `/appointments/:id` | ✅ | Update appointment details |
| `PATCH` | `/appointments/:id/status` | ✅ | Update appointment status |

### Follow-Ups (`/api/follow-ups`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/follow-ups` | ✅ | List follow-ups (optional `?doctorId=`) |
| `GET` | `/follow-ups/patient/:patientId` | ✅ | Get follow-ups for patient |
| `GET` | `/follow-ups/:id` | ✅ | Get follow-up by ID |
| `PATCH` | `/follow-ups/:id/status` | ✅ | Update follow-up status |

### Follow-Up Calls (`/api/followup-calls`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/followup-calls` | ✅ | List calls (filterable) |
| `GET` | `/followup-calls/:id` | ✅ | Get call by ID |
| `PATCH` | `/followup-calls/:id/cancel` | ✅ | Cancel a scheduled call |

### WebSocket (`/ws/followup-call`)

Real-time follow-up call events. Sends `LiveTranscriptEvent` messages:
- `type: "transcript"` — live transcription updates
- `type: "call_status"` — call status changes
- `type: "summary"` — AI-generated call summary with structured findings

### Other

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/upload/image` | ✅ | Upload image (multipart → Cloudinary) |
| `GET` | `/api/fhir/patient/:id/bundle` | ❌ | Export patient data as FHIR R4 Bundle |
| `GET` | `/api/stats/nurse` | ✅ | Nurse dashboard stats |
| `GET` | `/api/stats/doctor` | ✅ | Doctor dashboard stats |
| `GET` | `/api/stats/patient` | ✅ | Patient dashboard stats |
| `GET` | `/api/health` | ❌ | Health check |

---

## Frontend Application

### Routing Structure

The app uses **role-based routing** with an `AuthGuard` wrapper. Users are redirected to their role-specific dashboard after login.

| Route | Role | Page Component |
|---|---|---|
| `/signin` | Public | `AadhaarLoginPage` |
| `/video-room/:roomId` | Public | `PublicVideoRoom` |
| `/nurse` | Nurse | `NurseDashboard` |
| `/nurse/add-patient` | Nurse | `AddPatient` |
| `/nurse/edit-patient/:id` | Nurse | `EditPatient` |
| `/nurse/history` | Nurse | `NurseHistory` |
| `/nurse/follow-ups` | Nurse | `FollowUpList` |
| `/nurse/settings` | Nurse | `SettingsPage` |
| `/doctor` | Doctor | `DoctorDashboard` |
| `/doctor/consult/:patientId` | Doctor | `ConsultPage` |
| `/doctor/appointments` | Doctor | `DoctorAppointments` |
| `/doctor/video-call/:id` | Doctor | `VideoCallPage` |
| `/doctor/history` | Doctor | `DoctorHistory` |
| `/doctor/patient/:patientId` | Doctor | `PatientDetailPage` |
| `/doctor/follow-ups` | Doctor | `FollowUpList` |
| `/doctor/follow-up-consult/:followUpId` | Doctor | `FollowUpConsultPage` |
| `/doctor/settings` | Doctor | `SettingsPage` |
| `/patient` | Patient | `PatientPortal` |
| `/patient/history` | Patient | `PatientHistory` |
| `/patient/settings` | Patient | `SettingsPage` |

### State Management

- **Auth Store** (`store/index.ts`): Zustand store holding `user`, `token`, `isLoading`. Token is persisted in `localStorage`.
- **Server State**: No global cache (TanStack Query, SWR). Each page/hook fetches data independently via `api.ts`.

### Custom Hooks

| Hook | Purpose |
|---|---|
| `useAiAnalyze` | Trigger AI analysis of consultation data |
| `useConsult` | Create/manage consultation lifecycle |
| `useCreatePatient` | Patient creation form logic |
| `usePatient` / `usePatients` | Fetch single/all patients |
| `useDoctorHistory` | Fetch doctor's consultation history |
| `useNurseHistory` | Fetch nurse-created patient history |
| `usePatientHistory` | Fetch patient's own consultation history |
| `useSpeechRecognition` | Browser + API speech-to-text integration |
| `useStats` | Dashboard statistics for current role |
| `useSuggestPipeline` | Multi-step AI disease suggestion flow |
| `useUpdateProfile` | User profile update logic |

### UI Component Library

Base primitives in `components/ui/` follow **shadcn/ui** patterns (Radix + CVA + Tailwind):

`alert` · `badge` · `button` · `card` · `dialog` · `form-field` · `input` · `label` · `password-input` · `separator` · `skeleton` · `table` · `textarea`

### Vite Dev Server Proxy

The frontend proxies API calls to the backend during development (defined in `vite.config.ts`):

```
/api/*  →  http://localhost:3001
/ws/*   →  http://localhost:3001  (WebSocket)
```

---

## AI & ML Pipeline

### 1. Medical Analysis (`/api/ai/analyze`)
- **Input**: Transcript, symptoms, vitals, previous summary
- **Engine**: Google Gemini
- **Output**: SOAP notes, ICD-10 codes, prescription suggestions
- **Prompts**: `utils/medical-prompts.ts`

### 2. Disease Suggestion Pipeline (`/api/ai/suggest`)
A multi-stage RAG (Retrieval-Augmented Generation) pipeline:

```
Symptoms Input
     │
     ▼
┌─────────────────┐
│ Entity Extraction│  ← Extract medical entities from free text
└────────┬────────┘
         ▼
┌─────────────────┐
│ Vector Search    │  ← Pinecone similarity search on medical knowledge base
└────────┬────────┘
         ▼
┌─────────────────┐
│ External API     │  ← Additional medical database lookups
│ Search           │
└────────┬────────┘
         ▼
┌─────────────────┐
│ LLM Reranking    │  ← Gemini reranks results by clinical relevance
└────────┬────────┘
         ▼
┌─────────────────┐
│ Confidence Gate  │  ← Filter low-confidence results
└────────┬────────┘
         ▼
┌─────────────────┐
│ Response         │  ← Format final disease suggestions with ICD codes
│ Generator        │
└─────────────────┘
```

### 3. Speech-to-Text
- **Primary**: OpenAI Whisper API
- **Local fallback**: Python script (`transcribe.py`) using Ollama (Qwen2-Audio / Whisper)

### 4. Automated Follow-Up Calls
- **Scheduler**: `followup-scheduler.ts` runs on an interval, checks for due follow-ups
- **AI Agent**: `followup-call.service.ts` uses Gemini to conduct automated patient check-in calls
- **Real-time**: WebSocket streams live transcript and status updates to the doctor's UI
- **Prompts**: `utils/followup-prompts.ts`

### 5. Patient Summary Generation (`/api/ai/summarize`)
- Takes SOAP notes + ICD codes → generates patient-friendly summary via Gemini

---

## Healthcare Compliance

### FHIR R4 Integration
- **Export endpoint**: `GET /api/fhir/patient/:id/bundle`
- **Bundle builder**: `utils/fhir-bundle-builder.ts` constructs compliant FHIR Bundles
- **Mapper**: `utils/fhir-mapper.ts` converts internal Prisma models to FHIR resources (Patient, Condition, MedicationStatement, Encounter)

### HIPAA Logging
- `services/hipaa-logger.ts` provides structured audit logging for PHI access
- `AuditLog` model tracks userId, action, resourceType, resourceId, and timestamp

### PHI Encryption
- `services/phi-encryption.ts` provides encryption/decryption utilities for sensitive patient data at rest

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **SQLite default** | Zero-config local dev; script provided to migrate to PostgreSQL |
| **Aadhaar-based auth** | Unique national ID for India — enables patient identification across visits |
| **Simulated OTP** | Real Aadhaar OTP requires UIDAI API access; dev mode accepts any 6-digit code |
| **No client-side caching** | Keeps state management simple; acceptable for low-traffic clinic use |
| **Shared types package** | End-to-end type safety without code generation or runtime overhead |
| **Prisma + SQLite enums** | Uses native enums in schema but stores as strings in SQLite via migration script |
| **WebSocket for calls** | Follow-up calls need real-time transcript streaming; HTTP polling too slow |
| **Express 5** | Latest Express with improved async error handling |
| **Multi-AI provider** | Gemini for reasoning, OpenAI for embeddings/speech — best of both |

---

## Common Modification Scenarios

### Adding a New Database Model

1. **Define** the model in `apps/server/prisma/schema.prisma`
2. **Run** `pnpm db:migrate` (creates a migration)
3. **Generate** the client: `pnpm db:generate`
4. **Add types** to `packages/shared-types/src/index.ts`
5. **Create route** file in `apps/server/src/routes/`
6. **Mount route** in `apps/server/src/index.ts`
7. **Add API functions** to `apps/web/src/services/api.ts`
8. **Create hook** in `apps/web/src/hooks/`
9. **Update** `migrateToSqlite.js` if the model uses enums or arrays

### Adding a New Page

1. **Create** component in `apps/web/src/pages/<role>/`
2. **Add route** in `apps/web/src/App.tsx`
3. **Add sidebar link** in `apps/web/src/components/shared/SidebarNav.tsx`

### Adding a New AI Feature

1. **Create** service in `apps/server/src/services/`
2. **Add prompts** to `apps/server/src/utils/` (keep prompts separate from logic)
3. **Create route** in `apps/server/src/routes/`
4. **Mount** in `apps/server/src/index.ts` with `requireRole("DOCTOR")`
5. **Add API function** to `apps/web/src/services/api.ts`
6. **Create hook** in `apps/web/src/hooks/`

### Adding a New UI Component

1. **Base primitives**: Add to `apps/web/src/components/ui/` (follow shadcn/ui patterns)
2. **Role-specific**: Add to `apps/web/src/components/<role>/`
3. **Shared across roles**: Add to `apps/web/src/components/shared/`

### Switching to PostgreSQL

1. Start PostgreSQL: `docker compose up -d`
2. Update `DATABASE_URL` in `apps/server/.env`
3. Change `provider = "sqlite"` → `provider = "postgresql"` in `schema.prisma`
4. Restore enum types and `String[]` arrays (reverse `migrateToSqlite.js` changes)
5. Run `pnpm db:migrate`

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `prisma generate` fails | Run `pnpm install` first, then `cd apps/server && pnpm db:generate` |
| CORS errors | Check `FRONTEND_URL` in server `.env`; verify Vite proxy in `vite.config.ts` |
| AI endpoints return 500 | Ensure `GEMINI_API_KEY` is set in server `.env` |
| WebSocket not connecting | Confirm Vite proxy for `/ws` is configured; check server logs |
| SQLite enum errors | Run `node migrateToSqlite.js` from root to convert schema |
| Port 3001 already in use | Kill the process or change `PORT` in server `.env` |
| `@vox/shared-types` not found | Run `pnpm install` from root to link workspace packages |
| Seed fails with unique constraint | Database already has seed data; delete `dev.db` and re-push schema |

---

## Scripts Reference

### Root (`/`)
| Script | Command | Description |
|---|---|---|
| `dev` | `pnpm dev` | Start both server and web concurrently |
| `dev:web` | `pnpm dev:web` | Start frontend only |
| `dev:server` | `pnpm dev:server` | Start backend only |
| `build` | `pnpm build` | Build frontend for production |

### Server (`apps/server/`)
| Script | Command | Description |
|---|---|---|
| `dev` | `tsx watch src/index.ts` | Start server with hot reload |
| `build` | `tsc` | TypeScript compilation |
| `db:migrate` | `prisma migrate dev` | Create/apply database migration |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `db:push` | `prisma db push` | Push schema without migration |
| `db:seed` | `tsx src/seed.ts` | Seed demo data |

### Web (`apps/web/`)
| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Start Vite dev server (port 5173) |
| `build` | `tsc -b && vite build` | Type-check + production build |
| `preview` | `vite preview` | Preview production build |

---

## License

*No license specified. Add a `LICENSE` file to define usage terms.*
]]>
