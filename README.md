Quizbase Monorepo

Overview
- Full‑stack trivia app.
- Backend: Node.js (Express), Prisma, PostgreSQL, Socket.IO.
- Frontend: React + Vite.

Structure
- `backend/` API, sockets, Prisma schema, Docker Compose for Postgres.
- `frontend/quizbase/` React app consuming the API (`/api`).
- `scripts/launch.sh` Dev helper that boots DB and both servers.

Prerequisites
- Node.js 18+ and npm.
- Docker Desktop with Docker Compose (for local Postgres on port 5433).
- Windows users: run `scripts/launch.sh` from Git Bash or WSL.

Quick Start (recommended)
- `bash scripts/launch.sh`
  - Creates `backend/.env` and `frontend/quizbase/.env` if missing.
  - Starts Postgres via `backend/docker-compose.yml` on `localhost:5433`.
  - Installs deps and runs Prisma migrations/generate.
  - Starts backend on `http://localhost:4000` and frontend on `http://localhost:5173`.

Manual Setup
- Backend
  - `cd backend`
  - `cp .env.example .env` (edit `DATABASE_URL`/`CORS_ORIGIN` if needed)
  - `docker compose up -d` (starts Postgres on `localhost:5433`)
  - `npm install`
  - `npx prisma migrate deploy`
  - `npx prisma generate`
  - `npm run dev` (API at `http://localhost:4000`)
  - Optional: `npm run scraper` (fetches OpenTDB, writes `questions.json`, upserts DB)
- Frontend
  - `cd frontend/quizbase`
  - Create `.env` with: `VITE_API_BASE_URL=http://localhost:4000`
  - `npm install`
  - `npm run dev` (app at `http://localhost:5173`)

API and Realtime
- Health: `GET /healthz`, DB health: `GET /healthz/db`.
- REST base path: `/api` (auth, categories, questions, users, matches).
- WebSockets: Socket.IO on the backend origin for lobby/match events (presence, timer ticks, score updates).

Troubleshooting
- See `backend/README.md` for database and Prisma tips.
- If Docker isn’t available, point `DATABASE_URL` in `backend/.env` to a reachable Postgres and skip `docker compose`.
