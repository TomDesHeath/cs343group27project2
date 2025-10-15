#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend/quizbase"
BACKEND_ENV_FILE="$BACKEND_DIR/.env"
FRONTEND_ENV_FILE="$FRONTEND_DIR/.env"
BACKEND_PORT="${PORT:-4000}"
DEFAULT_DATABASE_URL="postgresql://quizbase:quizbase@localhost:5433/quizbase?schema=public"

banner() {
  printf "\n\033[1m==> %s\033[0m\n" "$1"
}

create_backend_env() {
  if [[ ! -f "$BACKEND_ENV_FILE" ]]; then
    banner "Creating backend/.env"
    if [[ -f "$BACKEND_DIR/.env.example" ]]; then
      cp "$BACKEND_DIR/.env.example" "$BACKEND_ENV_FILE"
    else
      cat >"$BACKEND_ENV_FILE" <<EOF
DATABASE_URL="$DEFAULT_DATABASE_URL"
CORS_ORIGIN="http://localhost:5173"
EOF
    fi
    printf " -> backend/.env created (update DATABASE_URL if needed)\n"
  fi
}

ensure_database() {
  if command -v docker >/dev/null 2>&1; then
    banner "Starting PostgreSQL via docker compose"
    (cd "$BACKEND_DIR" && docker compose up -d)
  else
    printf "\n⚠️  Docker not detected. Ensure DATABASE_URL in backend/.env points to a reachable PostgreSQL instance.\n"
  fi
}

prepare_backend() {
  banner "Installing backend dependencies"
  (cd "$BACKEND_DIR" && npm install)

  banner "Running Prisma migrations"
  (cd "$BACKEND_DIR" && npx prisma migrate deploy)

  banner "Generating Prisma client"
  (cd "$BACKEND_DIR" && npx prisma generate)
}

create_frontend_env() {
  if [[ ! -f "$FRONTEND_ENV_FILE" ]]; then
    banner "Creating frontend/quizbase/.env"
    cat >"$FRONTEND_ENV_FILE" <<EOF
VITE_API_BASE_URL=http://localhost:${BACKEND_PORT}
EOF
    printf " -> frontend/quizbase/.env created.\n"
  fi
}

prepare_frontend() {
  banner "Installing frontend dependencies"
  (cd "$FRONTEND_DIR" && npm install)
}

start_processes() {
  banner "Starting backend (port ${BACKEND_PORT})"
  (cd "$BACKEND_DIR" && PORT="${BACKEND_PORT}" npm run dev) &
  BACKEND_PID=$!

  banner "Starting frontend dev server"
  (cd "$FRONTEND_DIR" && npm run dev) &
  FRONTEND_PID=$!

  trap 'printf "\nStopping dev servers...\n"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' EXIT INT

  wait
}

main() {
  create_backend_env
  ensure_database
  prepare_backend
  create_frontend_env
  prepare_frontend
  start_processes
}

main "$@"
