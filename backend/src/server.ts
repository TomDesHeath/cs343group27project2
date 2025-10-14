/**
 * Entry point for the backend server.
 * - Wraps the Express app in a native HTTP server.
 * - Initializes WebSocket handling (via initSockets).
 * - Listens on the configured PORT (defaults to 4000).
 * - Logs a message when the server is up and running.
 */

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { initSockets } from "./sockets/index";

const app = express();
dotenv.config();

const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" }, serveClient: true });

initSockets(io);

// simple health route
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// categories route for tester.html
app.get("/categories", (_req, res) => {
  try {
    const p = path.join(__dirname, "..", "questions.json");
    const raw = fs.readFileSync(p, "utf-8");
    const arr = JSON.parse(raw) as Array<{ category?: string }>;
    const set = new Set<string>();
    for (const q of arr) {
      if (q.category && q.category.trim()) set.add(q.category.trim());
    }
    const categories = Array.from(set).sort();
    res.json({ categories });
  } catch (e) {
    res.status(500).json({ error: "Failed to read categories" });
  }
});

const PORT = Number(process.env.PORT || 4000);
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
