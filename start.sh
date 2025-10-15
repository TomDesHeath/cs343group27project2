#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend/quizbase"
FRONTEND_BUILD_DIR="$FRONTEND_DIR/dist"
BACKEND_PORT="${PORT:-4000}"

banner() {
  printf "\n\033[1m==> %s\033[0m\n" "$1"
}

prepare_backend() {
  banner "Installing backend dependencies"
  (cd "$BACKEND_DIR" && npm install)

  banner "Running Prisma migrations"
  (cd "$BACKEND_DIR" && npx prisma migrate deploy)

  banner "Generating Prisma client"
  (cd "$BACKEND_DIR" && npx prisma generate)
}

prepare_frontend() {
  banner "Installing frontend dependencies"
  (cd "$FRONTEND_DIR" && npm install)

  banner "Building frontend"
  (cd "$FRONTEND_DIR" && npm run build)
}

serve_frontend() {
  # Copy frontend build to backend public directory
  mkdir -p "$BACKEND_DIR/public"
  cp -r "$FRONTEND_BUILD_DIR/"* "$BACKEND_DIR/public/"
}

start_backend() {
  banner "Starting backend (port ${BACKEND_PORT})"
  (cd "$BACKEND_DIR" && PORT="${BACKEND_PORT}" npm run start)
}

main() {
  prepare_backend
  prepare_frontend
  serve_frontend
  start_backend
}

main "$@"