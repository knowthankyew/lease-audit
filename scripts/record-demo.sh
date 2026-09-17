#!/usr/bin/env bash
# ==============================================================================
# LeaseAudit - Automated Playwright Video Demo Recorder
# Generates web-standard demo.mp4 and animated demo.gif
# ==============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=========================================================="
echo "  ⚖️  LeaseAudit - Playwright Demo Video Recorder"
echo "=========================================================="

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Error: Node.js is required to record video demos."
  exit 1
fi

PORT="${PORT:-5173}"
URL="http://localhost:${PORT}"
STARTED_SERVER=false

# 1. Ensure server is running
if ! curl -s "${URL}/api/health" >/dev/null 2>&1; then
  echo "🚀 Starting temporary LeaseAudit instance on ${URL}..."
  dotnet run --project src/LeaseAudit.Api/LeaseAudit.Api.csproj -c Release --urls "${URL}" &
  SERVER_PID=$!
  STARTED_SERVER=true

  cleanup() {
    if [ "$STARTED_SERVER" = true ]; then
      echo "🛑 Shutting down temporary server (PID ${SERVER_PID})..."
      kill "${SERVER_PID}" 2>/dev/null || true
    fi
  }
  trap cleanup EXIT SIGINT SIGTERM

  # Wait for server readiness
  for i in {1..30}; do
    if curl -s "${URL}/api/health" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
fi

# 2. Run Playwright recording script
node scripts/record-demo.js

echo "=========================================================="
echo "  ✓ Demo generation finished!"
echo "  - Video: $REPO_ROOT/demo.mp4"
if [ -f "$REPO_ROOT/demo.gif" ]; then
  echo "  - GIF:   $REPO_ROOT/demo.gif"
fi
echo "=========================================================="
