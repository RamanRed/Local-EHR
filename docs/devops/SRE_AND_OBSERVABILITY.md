# Unit IV: Monitoring, Observability & Site Reliability Engineering (SRE)

This document formalizes the observability architecture, logging infrastructure, and Site Reliability Engineering (SRE) standards applied across **SarvaVaidya EHR**.

---

## 1. The Three Pillars of Observability

Observability enables operators to infer the internal state of a healthcare system based on its external outputs.

```
                         ┌─────────────────────────────────────────┐
                         │      Three Pillars of Observability     │
                         └────────────────────┬────────────────────┘
                                              │
             ┌────────────────────────────────┼────────────────────────────────┐
             ▼                                ▼                                ▼
   ┌───────────────────┐            ┌───────────────────┐            ┌───────────────────┐
   │      METRICS      │            │       LOGS        │            │      TRACES       │
   ├───────────────────┤            ├───────────────────┤            ├───────────────────┤
   │ Numeric values    │            │ Timestamped       │            │ Request lifecycle │
   │ aggregated over   │            │ discrete events   │            │ across services   │
   │ time (CPU, RAM,   │            │ with contextual   │            │ and database      │
   │ HTTP rates)       │            │ detail (HIPAA)    │            │ boundaries        │
   │                   │            │                   │            │                   │
   │ Tool: Prometheus  │            │ Tool: ELK Stack   │            │ Tool: Jaeger /    │
   │ / Grafana         │            │ (Elasticsearch)   │            │ OpenTelemetry     │
   └───────────────────┘            └───────────────────┘            └───────────────────┘
```

---

## 2. Metrics & Visualization: Prometheus + Grafana

### 2.1 Prometheus Metrics Endpoint (`/api/metrics`)
The SarvaVaidya backend exposes real-time runtime metrics in standard Prometheus text format:
- **`process_uptime_seconds`**: Total process uptime.
- **`nodejs_heap_size_used_bytes` / `nodejs_resident_memory_bytes`**: Memory allocation.
- **`process_cpu_user_seconds_total`**: Cumulative CPU time.
- **`http_requests_total`**: Total throughput of inbound HTTP calls.
- **`http_requests_by_status{status="2xx|3xx|4xx|5xx"}`**: Success vs. error ratios for error budget tracking.

### 2.2 Local Monitoring Stack (`monitoring/docker-compose.monitoring.yml`)
For demonstration and evaluation without loading the live EC2 instance, a self-contained monitoring environment is provided:
```bash
cd monitoring
docker compose -f docker-compose.monitoring.yml up -d
```
- **Prometheus UI**: `http://localhost:9090`
- **Grafana Dashboards**: `http://localhost:3000` (User: `admin` / Pass: `admin`)
- **Node Exporter**: `http://localhost:9100`

---

## 3. Centralized Logging: ELK Stack Architecture

```
  ┌────────────────────────────────────────────────────────┐
  │                      Log Sources                       │
  │  • Nginx Access & Error Logs (/var/log/nginx/)         │
  │  • PM2 API Console Logs (/root/.pm2/logs/)             │
  │  • PostgreSQL Query Logs (pg_stat_activity)            │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │             Logstash / Filebeat Shipper                │
  │  Filters, grok parsing, PHI anonymization              │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │              Elasticsearch (Storage & Indexing)        │
  │  Distributed JSON search engine with TTL retention     │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │               Kibana (Visualization Portal)            │
  │  Real-time search, error heatmaps, audit dashboards   │
  └────────────────────────────────────────────────────────┘
```

---

## 4. SRE Standards: SLAs, SLOs & SLIs

### 4.1 Definitions
- **SLI (Service Level Indicator)**: A quantifiable metric of service performance in real-time.
- **SLO (Service Level Objective)**: A target threshold for an SLI agreed upon by engineering and clinical teams.
- **SLA (Service Level Agreement)**: A formal commitment made to clinic stakeholders with associated business penalties.

### 4.2 SarvaVaidya Core Objectives

| Metric | Service Level Indicator (SLI) | Service Level Objective (SLO) | Service Level Agreement (SLA) |
|---|---|---|---|
| **Availability** | $\frac{\text{Successful Requests (2xx)}}{\text{Total Valid Requests}} \times 100$ | **99.9%** availability over a rolling 30-day window | 99.5% uptime (credit penalty below threshold) |
| **API Latency** | Duration from HTTP request ingress to response completion | **95%** of requests $<250$ms; **99%** $<600$ms | 95% of requests $<500$ms |
| **Consultation Save Latency** | Finalizing and persisting consultation SOAP notes | **99%** of consult saves $<400$ms | 95% $<1000$ms |
| **AI Inference Latency** | Gemini / Grok clinical reasoning roundtrip | **90%** of AI analyses $<3.5$s | N/A (Best-effort fallback to offline cache) |

### 4.3 Error Budgets
- At **99.9% availability**, the allowable downtime (Error Budget) over 30 days is:
  $$\text{Error Budget} = 30 \times 24 \times 60 \times (1 - 0.999) = \mathbf{43.2 \text{ minutes}}$$
- **Error Budget Policy**:
  - If $>75\%$ of the error budget is consumed within 7 days, non-critical feature deployments are paused; engineering focus shifts exclusively to reliability, testing, and latency optimization.

---

## 5. Incident Management Framework

### 5.1 Severity Levels

| Severity | Definition | Target Response (MTTA) | Target Resolution (MTTR) | Communication Cadence |
|---|---|---|---|---|
| **SEV-1 (Critical)** | System completely down; doctors cannot access patient records or consultations. | $<15$ minutes | $<2$ hours | Every 30 minutes |
| **SEV-2 (Major)** | Major clinical feature degraded (e.g. video calls failing, AI diagnosis offline), workaround available. | $<30$ minutes | $<4$ hours | Every 60 minutes |
| **SEV-3 (Moderate)** | Non-blocking bug or partial failure (e.g., patient statistics graph not loading). | $<2$ hours | $<24$ hours | Once per business day |
| **SEV-4 (Low)** | Minor cosmetic or documentation issues. | $<1$ business day | Next sprint release | Ticket updates |

---

## 6. Blameless Post-Mortem / RCA Template

When a SEV-1 or SEV-2 incident occurs, a blameless post-mortem is conducted within 48 hours:

```markdown
# Incident Post-Mortem: [Incident Title]
**Date**: YYYY-MM-DD
**Severity**: SEV-1 / SEV-2
**Incident Commander**: [Name]
**Duration**: [XX] minutes
**Impact**: [e.g. 14 consultation sessions delayed; 120 API requests failed]

## 1. Executive Summary
A brief description of what happened, what was affected, and how it was recovered.

## 2. Timeline (UTC)
- **14:02** — Anomaly detected via automated health probe / alert.
- **14:05** — On-call engineer paged and triaged issue.
- **14:15** — Root cause identified: out-of-memory error during large batch export.
- **14:22** — Temporary mitigation applied (process restarted with memory buffer).
- **14:40** — Permanent hotfix pushed and verified. Incident resolved.

## 3. Root Cause Analysis (The 5 Whys)
1. *Why did the API stop responding?* -> Node.js process crashed with OOM.
2. *Why did it run out of memory?* -> Memory heap exceeded 896MB.
3. *Why did the heap spike?* -> An unpaginated query retrieved 10,000 audit logs at once.
4. *Why was the query unpaginated?* -> Missing limit/offset in the export handler.
5. *Why was this not caught earlier?* -> Unit tests did not test large payload thresholds.

## 4. What Went Well vs. What Went Wrong
- **Went well**: Health probe caught the outage within 3 minutes; PM2 restarted automatically.
- **Went wrong**: Pagination validation was omitted in code review.

## 5. Corrective & Preventative Action Items
| Action Item | Type | Owner | Deadline |
|---|---|---|---|
| Add pagination constraint to audit log endpoint | Preventative | Dev | 2026-09-10 |
| Add heap memory usage alert in Prometheus | Detective | Ops | 2026-09-12 |
| Add large-payload load test in CI | Preventative | QA | 2026-09-15 |
```
