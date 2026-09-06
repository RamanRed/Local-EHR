# Unit II: Infrastructure as Code (IaC) and Containerization

This document details the Infrastructure as Code (IaC), configuration management, cloud architecture, and containerization strategy implemented in **SarvaVaidya EHR**.

---

## 1. Declarative vs. Imperative Infrastructure

| Paradigm | Definition | Tool in SarvaVaidya | Characteristics |
|---|---|---|---|
| **Declarative** | Defines **WHAT** the desired end-state should be; the engine computes diffs and steps to reach it. | **Terraform (`terraform/`)** | - Idempotent by design<br>- State-tracked via `terraform.tfstate`<br>- Self-healing drift detection |
| **Imperative** | Defines **HOW** step-by-step commands must execute sequentially. | **Deployment Scripts (`deploy_sarvavaidya.sh`)** | - Sequential execution<br>- Requires explicit error handling at every step<br>- Susceptible to intermediate failure states |

---

## 2. Resource Provisioning with Terraform

The `terraform/` directory provisions the complete AWS foundation in region `ap-south-1`:

```
                    ┌────────────────────────────────────────────────────────┐
                    │                   AWS VPC (10.0.0.0/16)                │
                    │                                                        │
                    │  ┌───────────────────────┐  ┌───────────────────────┐  │
                    │  │ Public Subnet 1       │  │ Public Subnet 2       │  │
                    │  │ 10.0.1.0/24 (AZ 1)    │  │ 10.0.2.0/24 (AZ 2)    │  │
                    │  │                       │  │                       │  │
                    │  │ ┌──────────────────┐  │  │                       │  │
                    │  │ │ EC2 App Host     │  │  │                       │  │
                    │  │ │ Elastic IP:      │  │  │                       │  │
                    │  │ │ 15.206.15.61     │  │  │                       │  │
                    │  │ └────────┬─────────┘  │  │                       │  │
                    │  └──────────┼────────────┘  └───────────────────────┘  │
                    │             │                                          │
                    │             ▼ (Port 5432 - Internal Only)               │
                    │  ┌───────────────────────────────────────────────────┐  │
                    │  │ Private Subnets (10.0.10.0/24 & 10.0.11.0/24)     │  │
                    │  │ ┌───────────────────────────────────────────────┐ │  │
                    │  │ │ AWS RDS PostgreSQL 16 (Private Database)      │ │  │
                    │  │ └───────────────────────────────────────────────┘ │  │
                    │  └───────────────────────────────────────────────────┘  │
                    └────────────────────────────────────────────────────────┘
```

### Terraform Components
1. **`vpc.tf`**: VPC, Internet Gateway, route tables, and subnet divisions.
2. **`ec2.tf`**: Amazon Linux 2023 instance, Elastic IP allocation, and IAM instance profile granting read access to SSM.
3. **`rds.tf`**: PostgreSQL DB subnet group and RDS instance locked in private subnets.
4. **`security_groups.tf`**:
   - Web SG: Ingress ports 80 (HTTP) and 22 (SSH from admin IP).
   - DB SG: Ingress port 5432 **only** from the Web SG (RDS is never directly exposed to the internet).

---

## 3. Configuration Management with Ansible

While Terraform provisions the raw infrastructure, **Ansible** configures the operating system and deploys the application runtime.

### 3.1 Key Properties
- **Agentless**: Operates via standard OpenSSH.
- **Idempotency**: Running playbooks multiple times produces the identical desired state without unintended side-effects.

### 3.2 Structure & Roles (`ansible/`)
- **`inventory/hosts.yml`**: Maps target servers (`15.206.15.61`).
- **`roles/common`**: Base packages, security updates, firewall rules.
- **`roles/nodejs`**: Node.js 20.x, pnpm, and global build toolchain.
- **`roles/nginx`**: Nginx web server configured for static asset serving and reverse proxying `/api` + `/ws`.
- **`roles/app`**: Git repository checkout, SSM parameter retrieval, Prisma migration, frontend build with memory limits, and PM2 process lifecycle management.
- **`playbooks/rollback.yml`**: Immediate recovery playbook reverting PM2 and Nginx to previous stable releases in case of deployment failure.

---

## 4. Cloud Database Comparison

| Feature | AWS RDS PostgreSQL | AWS Aurora PostgreSQL | Azure Database for PostgreSQL | GCP Cloud SQL for PostgreSQL |
|---|---|---|---|---|
| **Engine** | Standard Open-Source PostgreSQL | AWS-optimized distributed storage engine | Managed Community PostgreSQL | Managed PostgreSQL |
| **Storage Architecture** | EBS Volumes | Distributed 6-way replicated storage across 3 AZs | Managed Azure Premium Disks | Google Persistent Disks |
| **Failover Time** | ~60–120 seconds (Multi-AZ) | $<30$ seconds (Auto-failover) | ~60–120 seconds | ~60 seconds |
| **Use Case in SarvaVaidya** | **Current Dev/Demo DB** (Cost-effective for clinic MVP) | **Production Target** (High-throughput clinical scaling) | Alternative if hosted on Azure Cloud | Alternative if hosted on Google Cloud |

---

## 5. Containerization: Docker & Compose

### 5.1 Multi-Stage Docker Builds
Both frontend and backend utilize Docker multi-stage builds to optimize image sizes and security:
- **`apps/server/Dockerfile`**:
  - `builder` stage: Node 20 + pnpm, compiles TypeScript, generates Prisma client.
  - `runner` stage: Strips build tooling, retains only runtime node_modules, runs with unprivileged user.
- **`apps/web/Dockerfile`**:
  - `builder` stage: Builds React bundle using Vite.
  - `runner` stage: Ultra-lightweight `nginx:alpine` image serving static assets with gzip and caching.

### 5.2 Multi-Container Compose Stacks
- **`docker-compose.yml`**: Spawns isolated PostgreSQL 16 on port `5435` with persistent volume `pgdata` for local developers.
- **`docker-compose.prod.yml`**: Complete local production-replica stack composing `server`, `web`, `nginx`, and `postgres` within an isolated bridge network (`sarvavaidya-net`).

### 5.3 Monorepo vs. Microservices Architecture
SarvaVaidya uses a **Modular Monorepo** pattern:
- Shares single package management (`pnpm-workspace.yaml`) and type contract (`@vox/shared-types`).
- Provides microservice-like domain boundaries (Auth, Clinical Consult, AI Pipeline, Follow-ups) while avoiding the operational complexity of distributed network latency, separate deployments, and eventual consistency issues.
