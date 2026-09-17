#!/usr/bin/env bash
# ==============================================================================
# LeaseAudit - Zero-Config Launch Script
# 100% Local, Air-Gapped Statute-Grounded Lease Analyzer
# ==============================================================================
set -euo pipefail

PORT="${PORT:-5173}"
URL="http://localhost:${PORT}"

echo "=================================================="
echo "  ⚖️  LeaseAudit - Local Statute-Grounded Audit"
echo "  🔒 100% Local & Air-Gapped (Zero PII Egress)"
echo "=================================================="

# 1. Verify dotnet SDK
if ! command -v dotnet >/dev/null 2>&1; then
  echo "❌ Error: .NET SDK is not found. Please install .NET 10 SDK: https://dotnet.microsoft.com/download"
  exit 1
fi

DOTNET_VERSION=$(dotnet --version)
echo "✓ .NET SDK detected: ${DOTNET_VERSION}"

# 2. Build backend
echo "🔨 Building LeaseAudit backend..."
dotnet build src/LeaseAudit.Api/LeaseAudit.Api.csproj -c Release -v q --nologo

# 3. Check if port is in use
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "⚠️  Port ${PORT} is currently in use. Selecting port 5174..."
  PORT=5174
  URL="http://localhost:${PORT}"
fi

# 4. Launch backend
echo "🚀 Launching LeaseAudit on ${URL}..."
dotnet run --project src/LeaseAudit.Api/LeaseAudit.Api.csproj -c Release --no-build --urls "${URL}" &
API_PID=$!

# Trap signals for graceful shutdown
cleanup() {
  echo ""
  echo "🛑 Stopping LeaseAudit (PID: ${API_PID})..."
  kill -TERM "${API_PID}" 2>/dev/null || true
  wait "${API_PID}" 2>/dev/null || true
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
  if curl -s "${URL}/api/health" >/dev/null 2>&1; then
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

  wait "${API_PID}"
else
  echo "❌ Error: Server failed to start within timeout."
  exit 1
fi
