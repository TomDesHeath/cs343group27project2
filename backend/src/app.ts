/**
 * Basic Express server setup.
 * - Enables CORS so the API can be called from different domains (e.g. frontend on another port).
 * - Parses incoming JSON request bodies automatically.
 * - Provides a simple health check route at /healthz to verify the server is running.
 */

import express from "express";
import cors from "cors";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/healthz", (_req, res) => res.json({ ok: true }));
