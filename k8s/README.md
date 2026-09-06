# Kubernetes (K8s) Architecture & Deployment Guide

This directory provides production-ready Kubernetes manifests for orchestrating the **SarvaVaidya EHR** microservice stack.

---

## 1. Cluster Architecture Overview

```
                      [ External Client / Browser ]
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Ingress Controller│ (Nginx Ingress)
                         └──────────┬───────────┘
                                    │
               ┌────────────────────┴────────────────────┐
       /api or /ws                                       /
               │                                         │
               ▼                                         ▼
   ┌───────────────────────┐                 ┌───────────────────────┐
   │ Service:              │                 │ Service:              │
   │ sarvavaidya-server    │                 │ sarvavaidya-web       │
   │ (ClusterIP :3001)     │                 │ (ClusterIP :80)       │
   └───────────┬───────────┘                 └───────────┬───────────┘
               │                                         │
       ┌───────┴───────┐                         ┌───────┴───────┐
       ▼               ▼                         ▼               ▼
 ┌───────────┐   ┌───────────┐             ┌───────────┐   ┌───────────┐
 │ Pod 1     │   │ Pod 2     │             │ Pod 1     │   │ Pod 2     │
 │ (API)     │   │ (API)     │             │ (Nginx/UI)│   │ (Nginx/UI)│
 └─────┬─────┘   └─────┬─────┘             └───────────┘   └───────────┘
       │               │
       └───────┬───────┘
               ▼
   ┌───────────────────────┐
   │ Service:              │
   │ sarvavaidya-db        │
   │ (ClusterIP :5432)     │
   └───────────┬───────────┘
               ▼
   ┌───────────────────────┐
   │ Pod: postgres         │ ◄── PersistentVolumeClaim (10Gi)
   └───────────────────────┘
```

---

## 2. Manifest Inventory

| File | Resource Type | Description |
|---|---|---|
| `namespace.yaml` | `Namespace` | Isolates all resources in the `sarvavaidya` namespace |
| `configmap.yaml` | `ConfigMap` | Non-sensitive configurations (ports, URLs, pinecone parameters) |
| `secrets.yaml` | `Secret` | Sensitive credentials (database password, JWT secret, AI keys) |
| `postgres.yaml` | `Deployment`, `PVC`, `Service` | PostgreSQL 16 database with persistent block storage |
| `server.yaml` | `Deployment`, `Service` | Express 5 API (2 replicas with liveness/readiness probes) |
| `web.yaml` | `Deployment`, `Service` | React frontend served by Nginx (2 replicas) |
| `ingress.yaml` | `Ingress` | Path-based routing rules (`/api`, `/ws`, `/`) |
| `hpa.yaml` | `HorizontalPodAutoscaler` | Auto-scales API pods from 2 to 10 based on CPU/RAM |

---

## 3. Deployment Instructions

### Local Testing with Minikube

```bash
# 1. Start Minikube with Ingress and Metrics Server enabled
minikube start --cpus 4 --memory 6144
minikube addons enable ingress
minikube addons enable metrics-server

# 2. Apply manifests in sequence
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/server.yaml
kubectl apply -f k8s/web.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# 3. Verify pod health
kubectl get pods -n sarvavaidya -w

# 4. Map local hostname in /etc/hosts (or C:\Windows\System32\drivers\etc\hosts)
# <MINIKUBE_IP> sarvavaidya.local

# 5. Access the app at http://sarvavaidya.local
```

### Clean Up

```bash
kubectl delete namespace sarvavaidya
```
