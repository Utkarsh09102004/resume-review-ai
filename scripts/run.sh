#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Kill anything already running on ports 3000 (frontend) and 8000 (backend)
for port in 3000 3001 8000; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Killing processes on port $port: $pids"
    echo "$pids" | xargs kill 2>/dev/null || true
    sleep 1
  fi
done

# Start TeXLive compiler
echo "Starting TeXLive compiler on :3001 ..."
cd "$ROOT_DIR/texlive"
node server.js &
TEXLIVE_PID=$!

# Start backend
echo "Starting backend on :8000 ..."
cd "$ROOT_DIR/backend"
AUTH_ENABLED=false .venv/bin/uvicorn app.main:app --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend on :3000 ..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# Trap ctrl-c to kill both
cleanup() {
  echo ""
  echo "Shutting down ..."
  kill "$TEXLIVE_PID" "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$TEXLIVE_PID" "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "Done."
}
trap cleanup INT TERM

echo ""
echo "TeXLive:  http://localhost:3001"
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop both."
echo ""

wait
