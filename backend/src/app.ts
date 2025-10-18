/**
 * Basic Express server setup.
 * - Enables CORS so the API can be called from different domains (e.g. frontend on another port).
 * - Parses incoming JSON request bodies automatically.
 * - Provides a simple health check route at /healthz to verify the server is running.
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { prisma } from "./config/database";
import categoriesRouter from "./api/routes/categories";
import matchesRouter from "./api/routes/matches";
import usersRouter from "./api/routes/users";
import questionsRouter from "./api/routes/questions";
import authRoutes from "./routes/auth.routes";

export const app = express();
// Load env so CORS_ORIGIN is available even if server imports run later
dotenv.config();

const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Optional DB health check (uses Prisma). Returns 200 if DB responds.
app.get("/healthz/db", async (_req, res) => {
  try {
    // Simple no-op query to verify connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

// REST API routes (merged from external src)
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoriesRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/users", usersRouter);
app.use("/api/questions", questionsRouter);
