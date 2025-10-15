# Backend Setup

This API expects a PostgreSQL database. A ready-to-use Docker configuration is included to simplify local development.

## 1. Start the database

```bash
cd backend
cp .env.example .env          # only if you don't have an .env yet
docker compose up -d          # launches Postgres on localhost:5433
```

The default credentials are:

| Host      | Port | DB name | User    | Password |
|-----------|------|---------|---------|----------|
| localhost | 5433 | quizbase | quizbase | quizbase |

If you change any of these values, update `DATABASE_URL` inside `.env`.

## 2. Run Prisma migrations & generate the client

```bash
npx prisma migrate deploy
npx prisma generate
```

For a fresh database during development you can instead run:

```bash
npx prisma migrate reset
```

This command drops the database, applies the migration history, and rebuilds the Prisma client.

## 3. Seed data (optional)

If you have a seeding script you can run it at this point. The included project ships with `questions.json`; feel free to populate the database manually or write your own seed script.

## 4. Start the API

```bash
npm install
npm run dev
```

The server defaults to `http://localhost:4000`. Adjust the `PORT` environment variable if you need a different port.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Environment variable not found: DATABASE_URL` | Ensure `.env` exists and contains a valid PostgreSQL connection string. |
| Connection refused | Confirm the Docker container is running (`docker compose ps`) and that the port in `.env` matches the published port. |
| Prisma errors about pending migrations | Run `npx prisma migrate deploy` to sync the schema, or `npx prisma migrate reset` for a clean database. |

With the database up and the server running, the frontend can consume the API without `500` errors caused by missing infrastructure.
