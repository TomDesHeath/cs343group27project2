# QuizBase API

This documents the REST endpoints for Categories, Questions, and Match flow.

- OpenAPI: [`openapi.yaml`](./openapi.yaml)
- Postman: [`postman_collection.json`](./postman_collection.json)
- Dev auth: send header `x-user-id: <someUserId>` with requests.

## Base URL
- Local backend: `http://localhost:4000`

## Health
GET `/health` → `{ "ok": true }`

## Categories
GET `/api/categories` → 200 OK  
Example:
[ { "id":"...", "name":"General Knowledge" } ]

## Questions
GET `/api/questions?categoryId=<id>&limit=10` → 200 OK  
Example:
[ { "id":"...", "prompt":"What is the capital of France?", "categoryId":"..." } ]

## Matches (create → join → start → answer → state → leaderboard)

**Create** — POST `/api/matches` (header `x-user-id: host`)  
Body:
{ "title":"Demo", "perQuestionMs":20000, "categoryId": null }

**Join** — POST `/api/matches/{id}/join` (header `x-user-id: p2`)

**Start** — POST `/api/matches/{id}/start` (header `x-user-id: host`)

**Answer** — POST `/api/matches/{id}/answer` (header `x-user-id: p2`)  
Body:
{ "questionId":"...", "chosen":"Paris", "responseMs":1600 }  
Response:
{ "ok": true, "isCorrect": true, "scoreDelta": 97, "total": 97, "dbScore": 97 }

**State** — GET `/api/matches/{id}/state`

**Leaderboard** — GET `/api/matches/{id}/leaderboard`

## Errors
All errors are JSON like:
{ "error": "message", "details": "optional" }

## Notes
- Prisma + PostgreSQL; queries are parameterised.
- Real-time play uses WebSocket (not listed in OpenAPI).
- `x-user-id` is a dev-only stand-in for auth during marking.

