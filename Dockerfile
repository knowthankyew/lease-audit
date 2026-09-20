# syntax=docker/dockerfile:1
# ── Stage 1: Build Production Web Bundle ─────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /workspace

ARG VITE_OTEL_EXPORTER_OTLP_ENDPOINT=""
ENV VITE_OTEL_EXPORTER_OTLP_ENDPOINT=$VITE_OTEL_EXPORTER_OTLP_ENDPOINT

# Copy shared library and application
COPY privacy-telemetry/packages/privacy-telemetry /workspace/privacy-telemetry/packages/privacy-telemetry
COPY lease-audit /workspace/app

WORKDIR /workspace/app
RUN npm ci
RUN npm run build

# ── Stage 2: Hardened Air-Gapped Web Server ──────────────────────────
FROM nginx:alpine AS runner

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /workspace/app/dist /usr/share/nginx/html
COPY lease-audit/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
