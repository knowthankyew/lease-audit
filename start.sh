#!/usr/bin/env bash
# ==============================================================================
# LeaseAudit - Zero-Config Launch Script
# 100% Local, Air-Gapped Statute-Grounded Lease Reality Engine
# ==============================================================================
set -euo pipefail

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

echo "=================================================="
echo "  ⚖️  LeaseAudit - Local Statute-Grounded Audit"
echo "  🔒 100% Local & Air-Gapped (Zero PII Egress)"
echo "=================================================="

# 1. Verify Node.js & npm
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Error: Node.js is not found. Please install Node.js: https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node --version)
echo "✓ Node.js detected: ${NODE_VERSION}"

# 2. Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies with npm install..."
  npm install
fi

# 3. Check if port is in use
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "⚠️  Port ${PORT} is currently in use. Selecting port 3001..."
  PORT=3001
  URL="http://localhost:${PORT}"
fi

# 4. Launch Vite dev server
echo "🚀 Launching LeaseAudit on ${URL}..."
npx vite --port "${PORT}" &
DEV_PID=$!

# Trap signals for graceful shutdown
cleanup() {
  echo ""
  echo "🛑 Stopping LeaseAudit (PID: ${DEV_PID})..."
  kill -TERM "${DEV_PID}" 2>/dev/null || true
  wait "${DEV_PID}" 2>/dev/null || true
  echo "✓ LeaseAudit stopped cleanly. Session wiped."
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 5. Wait for server readiness
echo "⏳ Waiting for server readiness..."
MAX_ATTEMPTS=40
ATTEMPT=0
READY=false

while [ ${ATTEMPT} -lt ${MAX_ATTEMPTS} ]; do
  if curl -s "${URL}" >/dev/null 2>&1; then
    READY=true
    break
  fi
  sleep 0.25
  ATTEMPT=$((ATTEMPT + 1))
done

if [ "${READY}" = "true" ]; then
  echo "=================================================="
  echo "  ✓ LeaseAudit is running at ${URL}"
  echo "  Press Ctrl+C at any time to stop and wipe memory."
  echo "=================================================="
  
  # Open default browser
  if command -v open >/dev/null 2>&1; then
    open "${URL}"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${URL}"
  fi

  wait "${DEV_PID}"
else
  echo "❌ Error: Server failed to start within timeout."
  exit 1
fi
