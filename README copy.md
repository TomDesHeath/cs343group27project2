Backend (Real-time & Ingestion)

Quick start
- Install deps: npm install
- Dev server: npm run dev (http://localhost:4000)
- Health: GET /healthz
- Categories (for lobby filters): GET /categories
- Scraper: npm run scraper (writes questions.json)

WebSockets (Socket.IO)
- Contracts: see docs/events.md
- Tester: open src/tester.html in a browser

Scripts
- npm run dev   → ts-node-dev server
- npm run scraper → ts-node-dev scraper (OpenTDB)
- npm run build → tsc compile to dist/
- npm run start → node dist/server.js
- npm test      → vitest

Env
- Copy .env.example to .env and adjust:
  - PORT, CORS_ORIGIN

Notes
- No DB/Auth required for local play; questions load from questions.json.
- Category/difficulty filters are validated at start; insufficient pool → start rejected.

