# Unit I: DevOps Foundations, Methodologies & Version Control

This document formalizes the DevOps principles, methodologies, and version control architecture applied across the **SarvaVaidya EHR** project.

---

## 1. DevOps Basics & Business Benefits

### 1.1 Evolution & Philosophy
DevOps emerged as a response to the traditional silos separating Healthcare Software Engineering (focused on rapidly shipping clinical features) and Healthcare IT Operations (focused on system stability, HIPAA compliance, and 99.9% uptime). 

In SarvaVaidya, DevOps bridges this gap by integrating clinical development workflows with automated infrastructure provisioning, continuous deployment, and proactive observability.

### 1.2 Core Business Benefits
- **Reduced Lead Time for Changes**: Rapid rollout of bug fixes (e.g., patient role isolation, diagnosis prompt improvements) in minutes instead of weeks.
- **High Deployment Frequency**: Continuous integration builds and checks every commit automatically.
- **Lower Change Failure Rate**: Pre-commit linting, automated testing, and declarative infrastructure prevent configuration drift.
- **Minimized Mean Time to Recovery (MTTR)**: Fast automated rollback playbooks (`ansible/playbooks/rollback.yml`) and PM2 automatic process revival.

---

## 2. The CAMS Model in SarvaVaidya

The **CAMS** framework (Culture, Automation, Measurement, Sharing) provides the foundation for our operational workflow:

| CAMS Pillar | Implementation in SarvaVaidya EHR |
|---|---|
| **C — Culture** | Shared responsibility between clinical developers and system operators. Blameless incident post-mortems and collaborative pull requests. |
| **A — Automation** | - Infrastructure as Code with **Terraform**.<br>- Server configuration management with **Ansible**.<br>- CI/CD pipelines via **GitHub Actions** and **Jenkins**.<br>- Process orchestration via **PM2** and **Nginx**. |
| **M — Measurement** | - Application performance monitoring through Prometheus metrics (`/api/metrics`).<br>- Resource utilization metrics (CPU, RAM, Disk).<br>- HIPAA audit trails tracking all PHI access events. |
| **S — Sharing** | - Shared TypeScript types (`packages/shared-types`) eliminating frontend/backend discrepancies.<br>- OpenAPI / Swagger documentation (`/docs`) for cross-team API clarity.<br>- Standardized operational runbooks in documentation. |

---

## 3. The Three Ways (Gene Kim & The Phoenix Project)

### The First Way: Flow (Systems Thinking)
Accelerating the flow of work from Development $\to$ Operations $\to$ Customer:
- **Small Batch Sizes**: Pushing granular commits and modular pull requests rather than giant monolithic releases.
- **Eliminating Bottlenecks**: Automated TypeScript compilation and linting in CI catch errors before code reaches staging or production.
- **Limiting Work in Progress (WIP)**: Strict focus on delivering functional clinical vertical slices (e.g., Vitals Intake $\to$ SOAP Consultation $\to$ Prescription).

### The Second Way: Amplify Feedback Loops
Shortening and amplifying feedback loops to catch issues early:
- **Instant Developer Feedback**: Local Vite Hot Module Replacement (HMR) and `tsx watch` for near-instant validation.
- **CI Status Checks**: Automated build checks and test runs directly reported on pull requests.
- **Production Health Checks**: Nginx and PM2 health probes (`/api/health`) triggering automated restarts upon process degradation.

### The Third Way: Continual Experimentation & Learning
Fostering a culture of learning and continuous resilience:
- **Safe Staging Environments**: Replicable Terraform staging infrastructure for validating migrations before applying to production RDS.
- **Blameless Incident Reviews**: Post-mortems focused on systemic architecture improvements rather than individual blame.

---

## 4. Methodologies: Agile, Scrum & Kanban

### 4.1 Agile Principles in Healthcare IT
Healthcare systems require both agility to adapt to evolving clinical guidelines and rigor to ensure patient safety. Agile enables continuous delivery of valuable healthcare software while maintaining strict compliance.

### 4.2 Scrum vs. Kanban Framework

```
                    ┌──────────────────────────────────────────────┐
                    │               Agile Framework                │
                    └──────────────────────┬───────────────────────┘
                                           │
                 ┌─────────────────────────┴─────────────────────────┐
                 ▼                                                   ▼
      ┌─────────────────────┐                             ┌─────────────────────┐
      │     Scrum Model     │                             │    Kanban Model     │
      ├─────────────────────┤                             ├─────────────────────┤
      │ • 2-Week Sprints    │                             │ • Continuous Flow   │
      │ • Planned Backlogs  │                             │ • Strict WIP Limits │
      │ • Sprint Reviews    │                             │ • Focus on Cycle    │
      │   & Retrospectives  │                             │   Time & Lead Time  │
      └─────────────────────┘                             └─────────────────────┘
```

In SarvaVaidya:
- **Planned Clinical Features** (e.g., FHIR R4 Bundle Export, Multi-LLM integration) follow **2-week Scrum sprints**.
- **Critical Hotfixes & Ops Tasks** (e.g., security patching, memory tuning, DB re-indexing) follow a **Kanban continuous flow** with a maximum WIP limit of 3 concurrent active tickets.

---

## 5. Version Control: Git Architecture & Branching

### 5.1 The Git 3-Tree Architecture
Git manages code across three distinct trees:

```
┌─────────────────────────┐     git add      ┌─────────────────────────┐    git commit    ┌─────────────────────────┐
│    Working Directory    │ ───────────────► │   Index / Staging Area  │ ───────────────► │    Commit History       │
│  (Actual local files)   │ ◄─────────────── │   (Prepared snapshot)   │ ◄─────────────── │         (HEAD)          │
└─────────────────────────┘   git restore    └─────────────────────────┘    git reset     └─────────────────────────┘
```

1. **Working Directory**: The actual sandbox on your filesystem where files are edited.
2. **Index (Staging Area)**: The intermediate buffer (`git add`) where changes are collected and prepared for the next commit.
3. **HEAD (Commit History)**: The pointer to the current branch's latest snapshot in the local Git object database (`.git/objects`).

### 5.2 Branching Strategy

SarvaVaidya adheres to a **Trunk-Based Development with Short-Lived Feature Branches** workflow:

```
 master  ───●───────────●─────────────────●───────────● (Protected: Deployed to EC2)
             \         /                 /           /
 feature/     ●───●───● (PR + CI Check) /           /
                         \             /           /
 hotfix/                  ●───────────● (Urgent fix)
```

- **`master` (or `main`)**: Production branch. Always green, stable, and auto-deployable to the live EC2 host (`15.206.15.61`). Direct pushes are restricted via branch protection.
- **`feature/<name>`**: Short-lived branches created off `master` (lifespan $<3$ days). Requires CI pass and peer approval prior to squash-merging.
- **`hotfix/<name>`**: Urgent fixes applied directly to resolve production incidents, subsequently back-merged.
