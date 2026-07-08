#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Store PID of processes to kill on exit
BACKEND_PID=""
SCHEDULER_PID=""
CLIENT_PID=""

cleanup() {
    echo ""
    echo "=========================================="
    echo "Stopping all services..."
    echo "=========================================="
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$SCHEDULER_PID" ]; then
        kill "$SCHEDULER_PID" 2>/dev/null || true
    fi
    if [ -n "$CLIENT_PID" ]; then
        kill "$CLIENT_PID" 2>/dev/null || true
    fi
    exit 0
}

# Trap Ctrl+C (SIGINT) and exit (SIGTERM)
trap cleanup SIGINT SIGTERM

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
CLIENT_DIR="$PROJECT_ROOT/client"

echo "=========================================="
echo "Starting TeleSync Services..."
echo "=========================================="

# 1. Start Backend Server
echo "[Backend] Starting Django backend..."
cd "$BACKEND_DIR"
source backend_env/bin/activate
python manage.py runserver &
BACKEND_PID=$!

# 2. Start Scheduler
echo "[Scheduler] Starting background post scheduler..."
python manage.py run_scheduler &
SCHEDULER_PID=$!

# 3. Start Client Dev Server
echo "[Client] Starting Vite dev server..."
cd "$CLIENT_DIR"
npm run dev &
CLIENT_PID=$!

echo "=========================================="
echo "All services started!"
echo "Press Ctrl+C to stop all services."
echo "=========================================="

# Keep script running to listen to trap
wait
