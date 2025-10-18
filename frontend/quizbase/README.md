# Quizbase Frontend (React + Vite)

Overview
- React app for the Quizbase trivia game.
- Talks to the backend API at `VITE_API_BASE_URL` (defaults to `http://localhost:4000`).

Requirements
- Node.js 18+ and npm.

Setup
- Create `.env`:
  - `VITE_API_BASE_URL=http://localhost:4000`
- Install deps:
  - `npm install`
- Start dev server:
  - `npm run dev` (opens at `http://localhost:5173`)

Scripts
- `npm run dev`    Start Vite dev server
- `npm run build`  Production build to `dist/`
- `npm run preview` Preview the production build
- `npm run lint`   Lint sources

Notes
- The frontend expects the API under `${VITE_API_BASE_URL}/api` (handled automatically by the shared client).
- Ensure the backend is running and CORS allows `http://localhost:5173` (see `backend/.env`).
