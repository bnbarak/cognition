#!/usr/bin/env bash
#
# generate-openapi-specs.sh
#
# Starts the Express and Spring Boot servers, fetches their OpenAPI specs,
# saves them to the specs/ directory, and shuts the servers down.
#
# Usage:
#   ./scripts/generate-openapi-specs.sh
#
# Output:
#   specs/express-openapi.json
#   specs/springboot-openapi.json

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPECS_DIR="$REPO_ROOT/specs"
mkdir -p "$SPECS_DIR"

EXPRESS_PORT=3000
SPRINGBOOT_PORT=8080
EXPRESS_PID=""
SPRINGBOOT_PID=""

cleanup() {
  echo ""
  echo "Shutting down servers..."
  if [[ -n "$EXPRESS_PID" ]]; then
    kill "$EXPRESS_PID" 2>/dev/null && echo "  Express server (PID $EXPRESS_PID) stopped." || true
  fi
  if [[ -n "$SPRINGBOOT_PID" ]]; then
    kill "$SPRINGBOOT_PID" 2>/dev/null && echo "  Spring Boot server (PID $SPRINGBOOT_PID) stopped." || true
    # Spring Boot may need a moment to release the port
    sleep 2
  fi
}
trap cleanup EXIT

wait_for_server() {
  local url="$1"
  local name="$2"
  local max_attempts="${3:-60}"
  local attempt=0

  echo "Waiting for $name to be ready at $url ..."
  while ! curl -sf "$url" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [[ $attempt -ge $max_attempts ]]; then
      echo "ERROR: $name did not start within $max_attempts seconds."
      exit 1
    fi
    sleep 1
  done
  echo "  $name is ready."
}

# ── 1. Start Express server ──────────────────────────────────────────────────
echo "Starting Express server..."
cd "$REPO_ROOT/javascript"
npm run dev > /dev/null 2>&1 &
EXPRESS_PID=$!
wait_for_server "http://localhost:$EXPRESS_PORT/health" "Express"

# ── 2. Start Spring Boot server ──────────────────────────────────────────────
echo "Starting Spring Boot server..."
cd "$REPO_ROOT/java"
mvn -q spring-boot:run > /dev/null 2>&1 &
SPRINGBOOT_PID=$!
wait_for_server "http://localhost:$SPRINGBOOT_PORT/api-docs" "Spring Boot" 120

# ── 3. Fetch OpenAPI specs ───────────────────────────────────────────────────
echo ""
echo "Fetching OpenAPI specs..."

curl -sf "http://localhost:$EXPRESS_PORT/openapi.json" | python3 -m json.tool > "$SPECS_DIR/express-openapi.json"
echo "  Saved Express spec to specs/express-openapi.json"

curl -sf "http://localhost:$SPRINGBOOT_PORT/api-docs" | python3 -m json.tool > "$SPECS_DIR/springboot-openapi.json"
echo "  Saved Spring Boot spec to specs/springboot-openapi.json"

echo ""
echo "Done! OpenAPI specs saved to $SPECS_DIR/"
