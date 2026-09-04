# syntax=docker/dockerfile:1
###############################################################################
# apps/web/Dockerfile — SarvaVaidya React Frontend
# Multi-stage: builder (Vite) → runner (Nginx static server)
###############################################################################

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/shared-types/ ./packages/shared-types/
COPY apps/web/ ./apps/web/

# Build with stub env (real env vars baked in at runtime via window.__ENV__)
ARG VITE_ZEGOCLOUD_APP_ID=0
ARG VITE_ZEGOCLOUD_SERVER_SECRET=stub
ENV VITE_ZEGOCLOUD_APP_ID=$VITE_ZEGOCLOUD_APP_ID
ENV VITE_ZEGOCLOUD_SERVER_SECRET=$VITE_ZEGOCLOUD_SERVER_SECRET

RUN pnpm build

# ── Stage 2: Nginx static server ──────────────────────────────────────────────
FROM nginx:1.25-alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# SPA routing — all 404s go to index.html for React Router
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost/ || exit 1
