# SarvaVaidya — AI-Powered Cloud & Local EHR System

> **SarvaVaidya** (meaning *"Universal Healer"*) is an enterprise-grade, full-stack Electronic Health Record (EHR) system tailored for clinics, remote health centers, and modern medical practices. It integrates role-isolated workflows for **Doctors**, **Nurses**, and **Patients**, real-time video consultations, multi-LLM clinical decision support (Google Gemini & xAI Grok), Pinecone vector similarity search, FHIR R4 standard compliance, and autonomous AI-powered patient follow-up calls.

[![Deployment: Live on AWS EC2](https://img.shields.io/badge/Deployment-AWS%20EC2%20(Live)-orange?logo=amazon-aws)](http://15.206.15.61)
[![Runtime: Node.js & React 19](https://img.shields.io/badge/Stack-Node%20%7C%20React%2019%20%7C%20Vite-blue?logo=react)](https://react.dev)
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-blue?logo=postgresql)](https://www.postgresql.org)
[![ORM: Prisma](https://img.shields.io/badge/ORM-Prisma%206-black?logo=prisma)](https://www.prisma.io)
[![IaC: Terraform & Ansible](https://img.shields.io/badge/DevOps-Terraform%20%2B%20Ansible-purple?logo=terraform)](https://www.terraform.io)

---

## Table of Contents

- [Live Deployment Status](#live-deployment-status)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Role-Based Access Control & Routing](#role-based-access-control--routing)
- [Demo Credentials](#demo-credentials)
- [Getting Started (Local Development)](#getting-started-local-development)
- [Environment Variables](#environment-variables)
- [Database Management](#database-management)
- [Production Deployment (AWS EC2 + RDS)](#production-deployment-aws-ec2--rds)
- [Production Runbook & Maintenance (EC2)](#production-runbook--maintenance-ec2)
- [API Reference](#api-reference)
- [AI & Clinical Intelligence Pipeline](#ai--clinical-intelligence-pipeline)
- [Healthcare Compliance & Standards](#healthcare-compliance--standards)
- [Troubleshooting](#troubleshooting)
- [Scripts Reference](#scripts-reference)

---

## Live Deployment Status

The application is deployed live on AWS infrastructure:

- **Public Endpoint / Web App**: [http://15.206.15.61](http://15.206.15.61)
- **API Base URL**: `http://15.206.15.61/api`
- **Swagger Documentation**: `http://15.206.15.61/docs`
- **Health Check**: `http://15.206.15.61/api/health`
- **Region**: AWS `ap-south-1` (Mumbai)
- **Infrastructure**: EC2 (t3.micro / Amazon Linux 2023) + RDS PostgreSQL + Nginx + PM2

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                              │
│             React 19 · Vite 6 · Tailwind CSS · Zustand Store            │
│         RoleGuard & AuthGuard · Axios HTTP Client · WebSockets          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP :80 / WS
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Nginx Reverse Proxy (:80)                          │
│  Static Frontend: /opt/sarvavaidya/apps/web/dist (Direct static serve)  │
│  API Proxy:       /api/*  ───►  http://127.0.0.1:3001                   │
│  WebSocket Proxy: /ws/*   ───►  http://127.0.0.1:3001                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Backend: Express 5 API (PM2 Service)                   │
│      JWT Auth · Role-Based Middleware · HIPAA Logger · Swagger /docs    │
│                                                                         │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────┐ │
│ │  Auth & User  │ │ Patient & Reg │ │ Consultations │ │ Appointments │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ └──────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────┐ │
│ │  AI Pipeline  │ │ FollowUp Call │ │  FHIR Export  │ │ Stats/Upload │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ └──────────────┘ │
│         │                 │                 │                │         │
│         ▼                 ▼                 ▼                ▼         │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────┐ │
│ │  Prisma ORM   │ │  Google Gemini│ │ xAI Grok /    │ │   Pinecone   │ │
│ │ PostgreSQL 16 │ │     v1.42     │ │ OpenAI API    │ │ Vector Store │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

The system is structured as a high-performance **pnpm monorepo**:

| Package / Module | Path | Purpose |
|---|---|---|
| `@vox/web` | `apps/web/` | React 19 SPA with role-guarded routing & clinical dashboards |
| `@vox/server` | `apps/server/` | Express 5 REST & WebSocket API, AI orchestration, Prisma ORM |
| `@vox/shared-types` | `packages/shared-types/` | Shared TypeScript interfaces, DTOs, and enums |
| `terraform/` | `terraform/` | Infrastructure as Code for AWS VPC, EC2, RDS PostgreSQL, Security Groups |
| `ansible/` | `ansible/` | Automation playbooks for server configuration, builds, and PM2 deploys |

---

## Tech Stack

### Frontend (`apps/web`)
- **Framework**: React 19 (SPA)
- **Build Tool**: Vite 6
- **Routing**: React Router DOM 7 with route grouping and strict `RoleGuard` protection
- **Styling**: Tailwind CSS 3.4, `tailwindcss-animate`, Radix UI primitives
- **State**: Zustand 5 (persisted authentication & user context)
- **Forms & Validation**: React Hook Form + Zod
- **Icons**: Lucide React
- **Video Consultations**: ZegoCloud UIKit Prebuilt (`@zegocloud/zego-uikit-prebuilt`)
- **HTTP Client**: Axios with automatic JWT interceptors

### Backend (`apps/server`)
- **Runtime**: Node.js (v20+ / ES2022) with TypeScript (`tsx` for dev & production runner)
- **Web Framework**: Express 5
- **Database ORM**: Prisma 6 configured with **PostgreSQL**
- **Authentication**: Aadhaar-based OTP verification, signed JSON Web Tokens (JWT), role-level authorization middleware
- **Real-time**: WebSockets (`ws`) for live audio transcript streaming and status updates
- **AI Providers**:
  - **Google Gemini** (`@google/genai`): Clinical reasoning, SOAP note generation, patient summaries
  - **xAI Grok**: Secondary LLM integration for medical inference
  - **OpenAI**: Embeddings and speech processing
  - **Pinecone**: High-dimensional vector search for ICD-10 medical knowledge retrieval
- **Speech-to-Text**: Whisper API + local Python transcription worker (`transcribe.py`)
- **Storage**: Cloudinary for medical media and attachments
- **Standards & Security**: FHIR R4 Bundle Builder, HIPAA audit logging, PHI field encryption

### Cloud & DevOps Infrastructure
- **Cloud Provider**: Amazon Web Services (AWS `ap-south-1`)
- **Compute**: Amazon EC2 (Amazon Linux 2023)
- **Database**: PostgreSQL 16 (AWS RDS in private subnet; Docker container for local dev)
- **Process Manager**: PM2 (`sarvavaidya-api`) with automatic restarts and memory limits
- **Web Server & Reverse Proxy**: Nginx (serves static Vite bundle + proxies `/api` and `/ws`)
- **Provisioning**: Terraform + Ansible Automation

---

## Monorepo Structure

```
Local-EHR/
├── apps/
│   ├── server/                          # ── Express 5 API Server ──
│   │   ├── prisma/
│   │   │   └── schema.prisma            # PostgreSQL Prisma schema (10 models, 7 enums)
│   │   ├── src/
│   │   │   ├── index.ts                 # Express entry point, route mounting & WS server
│   │   │   ├── seed.ts                  # Database seeding script (Doctors, Nurses, Patients)
│   │   │   ├── swagger.ts               # Swagger OpenAPI documentation
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts            # Singleton Prisma client instance
│   │   │   ├── middleware/
│   │   │   │   └── auth.middleware.ts    # JWT verification & requireRole() guards
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts       # Aadhaar OTP auth, onboarding, profile
│   │   │   │   ├── patient.routes.ts    # Patient registration, search, vitals, revisits
│   │   │   │   ├── consult.routes.ts    # Consultation lifecycle (create, SOAP, finalize)
│   │   │   │   ├── ai.routes.ts         # Clinical AI analysis & patient summaries
│   │   │   │   ├── suggest.routes.ts    # Disease suggestion pipeline (symptom -> ICD)
│   │   │   │   ├── appointment.routes.ts# Appointment scheduling & status updates
│   │   │   │   ├── followup.routes.ts   # Follow-up records management
│   │   │   │   ├── followup-call.routes.ts # AI follow-up call management
│   │   │   │   ├── followup-call.ws.ts  # Real-time WebSocket for live transcripts
│   │   │   │   ├── fhir.routes.ts       # FHIR R4 bundle export endpoints
│   │   │   │   ├── stats.routes.ts      # Role-specific dashboard statistics
│   │   │   │   └── upload.routes.ts     # Media upload (Cloudinary)
│   │   │   ├── services/
│   │   │   │   ├── suggest-pipeline.ts  # Multi-stage AI disease suggestion engine
│   │   │   │   ├── vector-store.ts      # Pinecone/OpenAI vector retrieval
│   │   │   │   ├── followup-call.service.ts # Automated AI patient calls
│   │   │   │   ├── followup-scheduler.ts# Autonomous follow-up scheduler
│   │   │   │   ├── hipaa-logger.ts      # Audit logging for HIPAA compliance
│   │   │   │   └── phi-encryption.ts    # PHI data encryption at rest
│   │   │   └── utils/
│   │   │       ├── medical-prompts.ts   # Clinical system prompts
│   │   │       ├── followup-prompts.ts  # AI call system prompts
│   │   │       └── fhir-bundle-builder.ts # FHIR R4 Bundle generators
│   │   ├── .env.example                 # Backend environment variable template
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                             # ── React 19 Frontend SPA ──
│       ├── src/
│       │   ├── App.tsx                  # Root router with RoleGuard route groups
│       │   ├── main.tsx                 # React DOM mount point
│       │   ├── components/
│       │   │   ├── auth/                # Login and Aadhaar UI
│       │   │   ├── doctor/              # Doctor consultation and diagnosis views
│       │   │   ├── nurse/               # Nurse triage, vitals entry, intake views
│       │   │   ├── patient/             # Patient records & consultation history views
│       │   │   ├── shared/
│       │   │   │   ├── AuthGuard.tsx    # Unauthenticated user redirect to /signin
│       │   │   │   ├── RoleGuard.tsx    # Strict role verification & redirect guard
│       │   │   │   ├── RoleRedirect.tsx # Catch-all role redirector
│       │   │   │   ├── Layout.tsx       # Main app layout with role-aware navigation
│       │   │   │   └── Sidebar.tsx      # Role-filtered navigation sidebar
│       │   │   └── ui/                  # Shadcn-inspired UI components (Radix + Tailwind)
│       │   ├── pages/
│       │   │   ├── auth/AadhaarLoginPage.tsx
│       │   │   ├── doctor/              # Doctor Dashboard, Consult, Appointments, History
│       │   │   ├── nurse/               # Nurse Dashboard, AddPatient, EditPatient, History
│       │   │   ├── patient/             # Patient Portal & Consultation History
│       │   │   └── shared/              # Video Call, Settings, Follow-ups
│       │   ├── services/api.ts          # Axios client configured for all backend endpoints
│       │   └── store/index.ts           # Zustand auth & session store
│       ├── vite.config.ts               # Vite configuration with API & WS proxying
│       └── package.json
│
├── packages/
│   └── shared-types/                    # ── Shared Type Definitions ──
│       ├── src/index.ts                 # Enums, DTOs, and models shared across server & web
│       └── package.json
│
├── terraform/                           # ── AWS Infrastructure as Code ──
│   ├── vpc.tf                           # VPC, Public & Private Subnets, Internet Gateway
│   ├── ec2.tf                           # EC2 instance, Elastic IP, Security Groups, IAM
│   ├── rds.tf                           # RDS PostgreSQL subnet groups & database instance
│   └── outputs.tf                       # Output variables (Public IP, RDS Endpoint)
│
├── ansible/                             # ── Server Configuration & Deployment ──
│   ├── inventory/hosts.yml              # Target host definitions (15.206.15.61)
│   ├── playbooks/
│   │   ├── setup.yml                    # Initial server setup (Node, pnpm, Nginx, PM2)
│   │   └── deploy.yml                   # Code pull, build, migration, PM2 reload
│   └── roles/app/tasks/main.yml         # Core deployment tasks
│
├── deploy_sarvavaidya.sh                # End-to-end AWS deployment script (Bash/WSL)
├── deploy_sarvavaidya.ps1               # End-to-end AWS deployment script (PowerShell)
├── docker-compose.yml                   # Local PostgreSQL 16 container for development
├── docker-compose.prod.yml              # Containerized production stack for local simulation
└── package.json                         # Monorepo root scripts & pnpm workspace config
```

---

## Role-Based Access Control & Routing

The system enforces strict role isolation across all tiers (Database, Backend API, and Frontend Routing). A user logged in under one role cannot access screens or actions intended for another role.

### Frontend Route Isolation (`RoleGuard`)

Routes in `apps/web/src/App.tsx` are wrapped with `RoleGuard` components:

```tsx
// Doctor routes can ONLY be accessed by users with role "DOCTOR"
<Route element={<RoleGuard allowedRoles={["DOCTOR"]} />}>
  <Route path="/doctor" element={<DoctorDashboard />} />
  <Route path="/doctor/consult/:patientId" element={<ConsultPage />} />
  ...
</Route>
```

If a user navigates to an unauthorized route (e.g., a patient manually typing `/doctor` or `/nurse`), `RoleGuard` immediately intercepts the request and redirects them back to their home portal (`/patient`, `/doctor`, or `/nurse`).

| Role | Landing Route | Accessible Pages |
|---|---|---|
| **`DOCTOR`** | `/doctor` | Doctor Dashboard, Patient Consultation (`/doctor/consult/:id`), Appointment Scheduling, Video Consultations (`/doctor/video-call/:id`), Patient Detail, Consultation History, Follow-Up Management |
| **`NURSE`** | `/nurse` | Nurse Dashboard, Patient Intake & Registration (`/nurse/add-patient`), Edit Patient & Vitals (`/nurse/edit-patient/:id`), Patient Triage History, Follow-Up List |
| **`PATIENT`** | `/patient` | Patient Health Portal, Personal Medical & Prescription History, Profile Settings |
| **Public** | `/signin` | Aadhaar OTP Login, Video Room Join (`/video-room/:roomId`) |

### Backend API Protection

Backend routes enforce roles using `authMiddleware` and `requireRole(...)`:
- All patient modification and consultation endpoints require valid JWTs.
- Clinical AI analysis (`/api/ai/*`) and suggestion pipelines require `requireRole("DOCTOR")`.
- Patient search and triage endpoints accept `DOCTOR` and `NURSE` roles.

---

## Demo Credentials

The database comes pre-seeded with accounts for all roles. In development and demo environments, OTP verification is simulated—**any 6-digit OTP (e.g., `123456`) will successfully authenticate**.

| Role | Name | Aadhaar Number | Simulated OTP | Default Dashboard |
|---|---|---|---|---|
| **Doctor** | Dr. Arun Sharma | `111111111111` | Any 6 digits (e.g. `123456`) | `/doctor` |
| **Nurse** | Nurse Priya Patel | `000000000000` | Any 6 digits (e.g. `123456`) | `/nurse` |
| **Patient** | Rahul Mehta | `222222222222` | Any 6 digits (e.g. `123456`) | `/patient` |
| **Patient** | Sneha Iyer | `333333333333` | Any 6 digits (e.g. `123456`) | `/patient` |

---

## Getting Started (Local Development)

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **pnpm**: `v10.x` or higher (`npm install -g pnpm`)
- **Docker**: For running local PostgreSQL 16
- **Git**

### 2. Clone and Install Dependencies

```bash
git clone https://github.com/RamanRed/Local-EHR.git
cd Local-EHR
pnpm install
```

### 3. Start Local PostgreSQL Database

A lightweight PostgreSQL 16 container is configured in `docker-compose.yml`:

```bash
docker compose up -d
```
*This starts PostgreSQL on port `5435` with database `sarvavaidya`.*

### 4. Configure Environment Variables

```bash
# Backend Environment
cp apps/server/.env.example apps/server/.env

# Frontend Environment (optional, for ZegoCloud video calls)
cp apps/web/.env.example apps/web/.env
```

Ensure `apps/server/.env` has the local database connection string:
```env
DATABASE_URL="postgresql://sarvavaidya:sarvavaidya@localhost:5435/sarvavaidya"
JWT_SECRET="local-dev-jwt-secret-at-least-32-chars-long"
PORT=3001
NODE_ENV=dev
FRONTEND_URL=http://localhost:5173
```

### 5. Initialize the Database

```bash
cd apps/server

# Generate Prisma Client
pnpm db:generate

# Sync schema with PostgreSQL
pnpm db:push

# Seed demo users and patients
pnpm db:seed

cd ../..
```

### 6. Launch Development Servers

Run both backend and frontend concurrently from the workspace root:

```bash
pnpm dev
```

| Service | Address |
|---|---|
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) |
| **Backend API** | [http://localhost:3001](http://localhost:3001) |
| **Interactive API Docs (Swagger)** | [http://localhost:3001/docs](http://localhost:3001/docs) |
| **Health Check** | [http://localhost:3001/api/health](http://localhost:3001/api/health) |

---

## Environment Variables

### Backend (`apps/server/.env`)

| Variable | Required | Description | Default / Example |
|---|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://sarvavaidya:sarvavaidya@localhost:5435/sarvavaidya` |
| `JWT_SECRET` | ✅ Yes | Secret key for signing JWT tokens | Random 64-char string |
| `PORT` | ❌ No | Server port | `3001` |
| `NODE_ENV` | ❌ No | Environment mode (`dev` / `production`) | `dev` |
| `FRONTEND_URL` | ❌ No | Allowed CORS origin | `http://localhost:5173` |
| `APP_URL` | ❌ No | Base URL for video links generated in seed/consults | `http://15.206.15.61` |
| `GEMINI_API_KEY` | ⚡ AI | Google Gemini API key for clinical AI & summaries | [Google AI Studio](https://aistudio.google.com/) |
| `GROK_API_KEY` | ⚡ AI | xAI Grok API key (alternative reasoning model) | [xAI Console](https://console.x.ai/) |
| `GROK_MODEL` | ❌ No | Grok model name | `grok-beta` |
| `OPENAI_API_KEY` | ⚡ AI | OpenAI API key for embeddings | `sk-...` |
| `PINECONE_API_KEY` | ⚡ AI | Pinecone vector DB key for medical search | — |
| `PINECONE_INDEX` | ⚡ AI | Pinecone index name | `quickstart` |
| `PINECONE_NAMESPACE` | ⚡ AI | Pinecone namespace | `medical_ai_diseases` |
| `CLOUDINARY_CLOUD_NAME` | ❌ No | Cloudinary cloud name for file uploads | — |
| `CLOUDINARY_API_KEY` | ❌ No | Cloudinary API key | — |
| `CLOUDINARY_API_SECRET` | ❌ No | Cloudinary API secret | — |

### Frontend (`apps/web/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_ZEGOCLOUD_APP_ID` | ❌ No | ZegoCloud App ID for WebRTC video consultations |
| `VITE_ZEGOCLOUD_SERVER_SECRET` | ❌ No | ZegoCloud Server Secret |

---

## Database Management

The database layer is powered by **Prisma ORM** targeting **PostgreSQL 16**.

### Prisma Models (10 Core Models)

1. **`User`**: Doctor, Nurse, or Patient auth record with Aadhaar identity, name, contact, and specialization.
2. **`Patient`**: Clinical patient record with demographic information, blood group, triage status, and nurse attribution.
3. **`Vitals`**: Comprehensive vital snapshot (BP, heart rate, temperature, SpO2, respiratory rate, weight, height).
4. **`Consult`**: Doctor clinical encounter containing SOAP notes, diagnosis codes, symptoms, prescriptions, and follow-up directives.
5. **`Condition`**: ICD-10 coded medical conditions linked to patients and consultations.
6. **`Medication`**: Prescribed pharmaceuticals with dosage, frequency, duration, and instructions.
7. **`Appointment`**: Scheduled clinic visits, video sessions, or automated follow-up calls.
8. **`FollowUp`**: Tracking directives between doctor encounters.
9. **`FollowUpCall`**: State and audio transcription records of automated AI phone interactions.
10. **`AuditLog`**: Immutable HIPAA audit log of sensitive medical access events.

### Essential Database Commands

Execute within `apps/server`:

```bash
# Push schema updates directly to database (used in development and on EC2)
pnpm db:push

# Generate or update Prisma client
pnpm db:generate

# Seed the database with fresh demo doctors, nurses, and patients
pnpm db:seed

# Inspect database using Prisma Studio GUI
npx prisma studio
```

---

## Production Deployment (AWS EC2 + RDS)

The production infrastructure is automated using Terraform and Ansible:

### Infrastructure Architecture
- **VPC**: `10.0.0.0/16` with public subnets (EC2) and private subnets (RDS).
- **EC2 Instance**: Hosts the Nginx web server and PM2 API service.
- **RDS PostgreSQL**: Dedicated PostgreSQL 16 database running in private subnets, accessible only from the EC2 security group.
- **AWS SSM Parameter Store**: Secure storage for `DATABASE_URL`, `JWT_SECRET`, and API keys (`/sarvavaidya/dev/*`).

### Deploying via Script

From the project root on a machine with AWS CLI and Terraform configured:

```bash
# Run the automated deployment script
chmod +x deploy_sarvavaidya.sh
./deploy_sarvavaidya.sh dev
```

Or using PowerShell on Windows:
```powershell
.\deploy_sarvavaidya.ps1 -Environment dev
```

---

## Production Runbook & Maintenance (EC2)

This section details standard operational tasks on the live EC2 server (`15.206.15.61`).

### 1. Connecting to the EC2 Server via SSH

The SSH key is `sarvavaidya-keypair.pem`.

> [!IMPORTANT]
> **Windows / WSL SSH Permission Fix**:
> In WSL, files on `/mnt/c/` have default `0777` permissions which SSH rejects. Copy the key to your home directory first:
> ```bash
> cp /mnt/c/Users/raman/Desktop/trainer\ module/Local-EHR/sarvavaidya-keypair.pem ~/.ssh/
> chmod 600 ~/.ssh/sarvavaidya-keypair.pem
> ```

Connect via SSH:
```bash
ssh -i ~/.ssh/sarvavaidya-keypair.pem ec2-user@15.206.15.61
```

---

### 2. Pulling Code and Updating the Live App

When new code is pushed to `master`:

```bash
# Navigate to deployment directory
cd /opt/sarvavaidya

# Pull latest commits
sudo -u app git pull origin master

# Rebuild frontend with memory allocation limit
sudo -u app NODE_OPTIONS="--max-old-space-size=896" pnpm build

# Restart the backend API process
sudo -u app pm2 restart sarvavaidya-api
```

---

### 3. Resetting and Reseeding the Database on EC2

To wipe the database, sync the schema, and restore fresh demo accounts:

```bash
cd /opt/sarvavaidya/apps/server

# Reset schema and wipe all tables
sudo -u app npx prisma db push --force-reset --accept-data-loss

# Seed default doctor, nurse, and patient records
sudo -u app npx tsx src/seed.ts
```

---

### 4. Service Monitoring and Diagnostics

```bash
# Check PM2 backend status
sudo -u app pm2 status

# View live API logs
sudo -u app pm2 logs sarvavaidya-api --lines 100

# Restart PM2 process
sudo -u app pm2 restart sarvavaidya-api

# Check Nginx status & reload configuration
sudo systemctl status nginx
sudo systemctl reload nginx

# Check Nginx access/error logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## API Reference

All backend API routes are prefixed with `/api`. Protected routes require a Bearer token in the `Authorization` header: `Authorization: Bearer <jwt_token>`.

Interactive OpenAPI documentation is hosted live at **`/docs`**.

### Authentication (`/api/auth`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/aadhaar/send-otp` | Public | Initiates OTP delivery to the given Aadhaar number |
| `POST` | `/auth/aadhaar/verify-otp` | Public | Validates 6-digit OTP; issues JWT token or flags onboarding |
| `POST` | `/auth/aadhaar/onboard` | Public | Completes profile registration for newly registered users |
| `GET` | `/auth/me` | User | Retrieves the profile of the currently logged-in user |
| `PATCH` | `/auth/profile` | User | Updates phone, email, photo, or profile details |

### Patient Records (`/api/patients`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/patients` | Staff | Lists patients (filterable by `?status=WAITING`, etc.) |
| `GET` | `/patients/:id` | Staff | Retrieves complete patient record including latest vitals |
| `GET` | `/patients/search?aadhaar=` | Staff | Fast search across patients and registered user accounts |
| `POST` | `/patients` | Staff | Registers a new patient with optional baseline vitals |
| `PATCH` | `/patients/:id` | Staff | Modifies patient demographics and vitals |
| `PATCH` | `/patients/:id/status` | Staff | Updates workflow status (`WAITING`, `IN_CONSULT`, etc.) |
| `POST` | `/patients/:id/revisit` | Staff | Registers a returning patient visit with newly captured vitals |
| `GET` | `/patients/:patientId/consults`| Staff | Fetches complete clinical consultation history |

### Consultations (`/api/consults`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/consults` | Doctor | Initiates an encounter for a waiting patient |
| `GET` | `/consults` | Doctor | Lists all encounters conducted by the requesting doctor |
| `GET` | `/consults/:id` | Doctor | Retrieves consultation details, SOAP notes, and prescriptions |
| `PATCH` | `/consults/:id` | Doctor | Updates SOAP notes, ICD codes, medications, and finalizes consult |

### AI Clinical Decision Support (`/api/ai`)
*Restricted to users with the `DOCTOR` role.*
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ai/analyze` | Generates SOAP notes, differential diagnoses, and prescriptions from visit transcript |
| `POST` | `/ai/suggest` | Disease suggestion pipeline: Symptom extraction -> Vector search -> LLM reranking |
| `POST` | `/ai/suggest/confirm` | Confirms selected ICD code and generates comprehensive clinical treatment plan |
| `POST` | `/ai/summarize` | Translates technical SOAP notes into patient-friendly lay language instructions |
| `POST` | `/ai/transcribe` | Transcribes audio recordings into structured medical transcripts |

### Appointments & Follow-ups
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/appointments` | User | Schedules an in-clinic, video, or call appointment |
| `GET` | `/appointments` | Staff | Lists appointments with date and status filters |
| `GET` | `/appointments/my` | User | Returns personal appointments for the active user |
| `PATCH` | `/appointments/:id/status` | Staff | Updates appointment status (`confirmed`, `completed`, `cancelled`) |
| `GET` | `/follow-ups` | Staff | Lists follow-up directives across all clinic patients |
| `PATCH` | `/follow-ups/:id/status` | Staff | Closes or cancels follow-up tasks |
| `GET` | `/followup-calls` | Staff | Lists autonomous AI follow-up phone interactions |

### Standards & System
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/fhir/patient/:id/bundle` | Public | Generates and exports a standard FHIR R4 JSON Bundle |
| `POST` | `/upload/image` | Staff | Uploads clinical images/attachments to Cloudinary |
| `GET` | `/stats/nurse` | Nurse | Real-time statistics for nurse intake and triage |
| `GET` | `/stats/doctor` | Doctor | Real-time statistics for completed consults and queue |
| `GET` | `/stats/patient` | Patient | Patient statistics and upcoming appointments count |
| `GET` | `/health` | Public | Health probe endpoint returning `{ "status": "ok" }` |

---

## AI & Clinical Intelligence Pipeline

SarvaVaidya implements a hybrid multi-LLM architecture designed for clinical precision:

### 1. Multi-Stage Disease Suggestion Pipeline (RAG)
```
Free-text Symptoms & Clinical Observations
                     │
                     ▼
        [ Medical Entity Extraction ]
  Extracts anatomical sites, symptoms, and duration
                     │
                     ▼
       [ Pinecone Vector Search (1536d) ]
  Semantic retrieval of ICD-10 diagnostic embeddings
                     │
                     ▼
         [ LLM Clinical Reranking ]
  Gemini / Grok evaluates context relevance
                     │
                     ▼
         [ Confidence Gating ]
  Rejects low-confidence medical candidates
                     │
                     ▼
  Ranked Differential Diagnoses + Treatment Protocols
```

### 2. Autonomous Patient Follow-up Calls
- An interval-based scheduler (`followup-scheduler.ts`) tracks scheduled patient follow-ups.
- Gemini Live-driven agent (`followup-call.service.ts`) conducts structured check-in calls with patients to assess recovery progress, medication adherence, and adverse symptoms.
- Real-time transcripts stream directly to the doctor's web interface over WebSockets (`/ws/followup-call`).

---

## Healthcare Compliance & Standards

### FHIR R4 Bundle Export
SarvaVaidya supports interoperable health data exchange adhering to the **HL7 FHIR Release 4** standard.
- The `/api/fhir/patient/:id/bundle` endpoint constructs a complete FHIR `Bundle` of type `document`.
- Automatically maps internal Prisma models into validated resources:
  - `Patient` (demographics, Aadhaar national identifier)
  - `Condition` (ICD-10 clinical diagnoses)
  - `MedicationStatement` (prescribed drugs and dosages)
  - `Encounter` (consultation sessions and doctor attributions)

### HIPAA Audit Logging
- Every read and write access to Protected Health Information (PHI) is immutably recorded in the `AuditLog` table via `hipaa-logger.ts`.
- Captures timestamp, acting `userId`, `action` (`CREATE`, `READ`, `UPDATE`, `DELETE`), resource type, and record ID.

### PHI Encryption
- Sensitive clinical fields can be encrypted at rest using AES-256-GCM via `phi-encryption.ts`.

---

## Troubleshooting

| Issue | Root Cause | Solution |
|---|---|---|
| **Permission denied (`sarvavaidya-keypair.pem`) on SSH** | Windows/WSL filesystem permissions are `0777` by default | Copy key to WSL home: `cp key.pem ~/.ssh/ && chmod 600 ~/.ssh/key.pem`, then SSH using that path. |
| **Doctor / Patient pages confused or unauthorized access** | Accessing a URL belonging to a different role | Protected by `RoleGuard`. Ensure you log in with the correct Aadhaar number (`111111111111` for Doctor, `000000000000` for Nurse, `222222222222` for Patient). |
| **Prisma schema out of sync on EC2** | RDS tables modified or reset | Run `cd /opt/sarvavaidya/apps/server && sudo -u app npx prisma db push --accept-data-loss`. |
| **Frontend build runs out of memory on EC2 (`t3.micro`)** | Node.js default heap exceeds available memory | Run build with memory cap: `sudo -u app NODE_OPTIONS="--max-old-space-size=896" pnpm build`. |
| **Nginx returns 502 Bad Gateway** | PM2 API process is stopped or crashed | Run `sudo -u app pm2 status` and `sudo -u app pm2 logs sarvavaidya-api` to inspect crash logs. Restart with `pm2 restart sarvavaidya-api`. |
| **AI suggestions return 500 error** | Missing or invalid AI API key | Verify `GEMINI_API_KEY` or `GROK_API_KEY` in `apps/server/.env`. |
| **Port 5435 already in use locally** | Another PostgreSQL instance running | Stop conflicting container with `docker stop <container>` or adjust port in `docker-compose.yml`. |

---

## Scripts Reference

### Workspace Root (`/`)
| Script | Command | Description |
|---|---|---|
| `pnpm dev` | `concurrently ...` | Runs both backend API and frontend dev server simultaneously |
| `pnpm dev:web` | `pnpm --filter @vox/web dev` | Starts frontend Vite dev server only (port `5173`) |
| `pnpm dev:server` | `pnpm --filter @vox/server dev` | Starts backend Express API only (port `3001`) |
| `pnpm build` | `pnpm --filter @vox/web build` | Compiles TypeScript and builds production Vite bundle |

### Backend (`apps/server/`)
| Script | Command | Description |
|---|---|---|
| `pnpm dev` | `tsx watch src/index.ts` | Starts backend with automatic TypeScript watch & reload |
| `pnpm build` | `tsc` | Compiles TypeScript to `dist/` |
| `pnpm db:generate` | `prisma generate` | Generates typed Prisma Client |
| `pnpm db:push` | `prisma db push` | Pushes Prisma schema directly to PostgreSQL |
| `pnpm db:seed` | `tsx src/seed.ts` | Seeds database with demo doctors, nurses, and patients |
| `pnpm db:migrate` | `prisma migrate dev` | Creates and runs Prisma database migrations |

### Frontend (`apps/web/`)
| Script | Command | Description |
|---|---|---|
| `pnpm dev` | `vite` | Starts local Vite dev server with HMR |
| `pnpm build` | `tsc -b && vite build` | Type-checks and creates production build in `dist/` |
| `pnpm preview` | `vite preview` | Previews production build locally |

---

## License

This project is licensed under the MIT License.
