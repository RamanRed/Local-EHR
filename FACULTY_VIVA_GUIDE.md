# SarvaVaidya EHR — DevOps Faculty Presentation & Viva Guide

This document is your master cheat-sheet for demonstrating this project to faculty, examiners, and evaluators across all 4 syllabus units.

---

## ⏱️ 5-Minute Faculty Presentation Script

When asked to present your project, speak confidently following this 5-step script:

1. **Introduction (30s)**:
   > *"Good morning/afternoon, Sir/Ma'am. My project is **SarvaVaidya**, an AI-powered Electronic Health Record system with role-isolated clinical portals for Doctors, Nurses, and Patients. From a DevOps perspective, I have implemented full end-to-end automation across all four syllabus units—from version control and IaC to CI/CD, Kubernetes orchestration, and SRE observability."*

2. **Unit I — Foundations & Git (45s)**:
   > *"For Unit I, I implemented the **CAMS model** and **The Three Ways**. We use Git's 3-tree architecture with trunk-based branching. Every pull request enforces standardized issue templates and quality checklists in `.github/`."*

3. **Unit II — IaC & Containerization (60s)**:
   > *"For Unit II, I adopted a **declarative IaC** approach using **Terraform** to provision an AWS VPC, EC2 instance, and private RDS PostgreSQL database in `ap-south-1`. Configuration management is automated using **Ansible** playbooks with idempotent roles. For containerization, both frontend and backend use **multi-stage Docker builds** to optimize image security and size."*

4. **Unit III — CI/CD, DevSecOps & Kubernetes (75s)**:
   > *"For Unit III, our primary CI pipeline runs on **GitHub Actions with 7 automated stages**—all currently passing 100% green. It runs type checks, executes automated unit tests, compiles the production bundle, tests Docker container builds, validates Terraform syntax, runs Ansible linter, and executes **DevSecOps vulnerability scans using Trivy and pnpm audit**. For multi-platform versatility, I also created declarative **`Jenkinsfile`** and **`.gitlab-ci.yml`** pipelines. For container orchestration, I developed both raw **Kubernetes manifests (`k8s/`)** with an HPA autoscaler and a complete **Helm Chart (`helm/`)**."*

5. **Unit IV — Observability & SRE (60s)**:
   > *"For Unit IV, our backend actively exposes real-time runtime metrics in Prometheus format at `/api/metrics`. I configured a local monitoring stack with **Prometheus and Grafana**. For SRE practices, our system defines concrete **SLIs, SLOs (99.9% availability), and SLAs**, tracks an error budget of 43.2 minutes per month, follows a SEV-1 to SEV-4 incident response matrix, and enforces blameless post-mortem reviews."*

---

## 🗺️ Project Architecture Mapping (The 4 Units)

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ UNIT I: FOUNDATIONS & GIT                                                                │
│ Trunk-based Git · Issue/PR Templates (.github/) · CAMS Model · The Three Ways            │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ UNIT II: INFRASTRUCTURE AS CODE & CONTAINERS                                             │
│ Terraform (AWS VPC + EC2 + RDS) · Ansible (Nginx + PM2) · Docker Multi-stage Builds       │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ UNIT III: CI/CD, DEVSECOPS & KUBERNETES                                                   │
│ GitHub Actions (7 Green Jobs) · Trivy DevSecOps · Kubernetes (k8s/) · Helm Chart (helm/)  │
│ Portability: Declarative Jenkinsfile & .gitlab-ci.yml                                     │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ UNIT IV: MONITORING, OBSERVABILITY & SRE                                                  │
│ /api/metrics (Prometheus) · Grafana Dashboards · ELK Logging Arch · 99.9% SLO & Error Budget│
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Top 10 Faculty Viva Questions & 30-Second Answers

### Q1: What is the CAMS model and how is it used in your project?
> **Answer**: *"CAMS stands for **Culture, Automation, Measurement, and Sharing**. In SarvaVaidya: **Culture** is demonstrated through blameless post-mortems; **Automation** via Terraform, Ansible, and GitHub Actions; **Measurement** through Prometheus metrics and HIPAA audit logs; and **Sharing** via shared TypeScript types (`@vox/shared-types`) and OpenAPI Swagger documentation."*

---

### Q2: What is the difference between Declarative and Imperative IaC? Which did you use?
> **Answer**: *"Imperative IaC specifies the step-by-step commands of **how** to achieve a state (like bash scripts). Declarative IaC defines **what** the final state must be, allowing the engine to calculate the delta and manage drift. I used **declarative Terraform** for cloud resource provisioning and **Ansible** for idempotent configuration management."*

---

### Q3: What is the Git 3-Tree Architecture?
> **Answer**: *"Git manages code across three areas:  
> 1. **Working Directory**: The active local files you edit.  
> 2. **Index (Staging Area)**: Files marked with `git add` prepared for the next commit.  
> 3. **HEAD (Commit Tree)**: The local repository's permanent history of committed snapshots."*

---

### Q4: Explain the jobs in your GitHub Actions CI pipeline.
> **Answer**: *"Our CI workflow runs 7 automated jobs:  
> 1. `TypeScript Type Check`: Validates types across frontend and backend.  
> 2. `Run Unit Tests`: Executes 5 automated test suites.  
> 3. `Build All Packages`: Compiles the Vite React bundle.  
> 4. `Terraform Format & Validate`: Ensures IaC syntax and formatting correctness.  
> 5. `Ansible Lint`: Audits playbooks for best practices.  
> 6. `DevSecOps Security Scan`: Scans for CVE vulnerabilities using Trivy and `pnpm audit`.  
> 7. `Docker Image Build Test`: Validates that the multi-stage Docker container builds cleanly."*

---

### Q5: Why did you provide both raw Kubernetes manifests and a Helm Chart?
> **Answer**: *"Raw manifests in `k8s/` show explicit Kubernetes primitives (Deployments, ClusterIP Services, Ingress, PersistentVolumeClaims, and HPA). The Helm chart in `helm/sarvavaidya/` parameterizes these manifests using `values.yaml`, making the application packageable, versionable, and reusable across multiple environments (Dev, Staging, Prod) with a single command."*

---

### Q6: How does DevSecOps differ from traditional DevOps in your pipeline?
> **Answer**: *"Traditional DevOps focuses solely on speed of delivery (Build $\to$ Test $\to$ Deploy). DevSecOps 'shifts security left' by automating vulnerability scans **during** the pipeline. In our CI, **Trivy** inspects the Docker container OS and libraries for critical CVEs, and **`pnpm audit`** checks third-party dependencies before any code can be deployed."*

---

### Q7: What are SLIs, SLOs, and SLAs in your system?
> **Answer**: *"An **SLI** is the real-time measurement (e.g., HTTP 2xx request success rate). An **SLO** is the internal engineering target (e.g., 99.9% uptime over 30 days). An **SLA** is the external contractual agreement with clinic stakeholders (e.g., 99.5% uptime with financial penalties if breached). At 99.9% SLO, our monthly error budget is 43.2 minutes."*

---

### Q8: How does the Kubernetes Horizontal Pod Autoscaler (HPA) function?
> **Answer**: *"Our `hpa.yaml` targets the `sarvavaidya-server` deployment. It queries metrics-server and scales pod replicas between a minimum of 2 and maximum of 10 whenever average CPU utilization exceeds 75% or memory exceeds 80%, ensuring clinical availability during peak appointment hours."*

---

### Q9: Why did you run Node with PM2 on the live EC2 instead of running ELK or Minikube directly on it?
> **Answer**: *"Our live EC2 is a cost-effective `t3.micro` instance with 1 vCPU and 1 GB of RAM. Running heavyweight tools like Elasticsearch (which requires 2–4 GB) or Minikube directly on that instance would trigger the Linux OOM (Out Of Memory) killer and crash the EHR. Therefore, the live EC2 runs a lean, high-performance Nginx + PM2 setup, while Kubernetes and Prometheus/Grafana stacks are provided as declarative containers for local evaluation."*

---

### Q10: How does Prometheus scrape metrics from your Express application?
> **Answer**: *"We created a custom Prometheus exporter at `/api/metrics` using standard `text/plain; version=0.0.4` format. It tracks process uptime, heap memory, CPU usage, and HTTP request counters categorized by status code family (2xx, 3xx, 4xx, 5xx). Prometheus queries this endpoint every 15 seconds as defined in `monitoring/prometheus/prometheus.yml`."*

---

## 🖥️ Live Demonstration Checklist

Open these tabs in your browser before presenting:

1. **GitHub Actions Workflow (All Green)**:
   - URL: `https://github.com/RamanRed/Local-EHR/actions`
   - Show: Click on the latest run to show the 7 green checkmarks.

2. **Live Application on EC2**:
   - URL: `http://15.206.15.61`
   - Show: Aadhaar Login (`111111111111` for Doctor, `000000000000` for Nurse).

3. **Prometheus Metrics Endpoint**:
   - URL: `http://15.206.15.61/api/metrics` (or `http://localhost:3001/api/metrics`)
   - Show: Raw Prometheus metrics (`process_uptime_seconds`, `http_requests_by_status`).

4. **Codebase Navigation (in VS Code or GitHub)**:
   - `terraform/` (VPC, EC2, RDS)
   - `ansible/` (Playbooks & roles)
   - `k8s/` & `helm/sarvavaidya/` (Kubernetes manifests & Helm chart)
   - `Jenkinsfile` & `.gitlab-ci.yml` (CI/CD portability)
   - `docs/devops/` (CAMS, IaC, and SRE manuals)
