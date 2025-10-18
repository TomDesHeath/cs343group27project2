/**
 * Main entry point for the backend server.
 *
 * This file creates and starts the HTTP server that powers the backend.
 * It loads environment variables, sets up the Express app, and attaches
 * Socket.IO for real-time communication.
 *
 * Once running, the server listens on the configured port (default: 4000)
 * and logs both the backend port and the expected frontend URL.
 */

import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { initSockets } from "./sockets/index";
import { app } from "./app";

// Ensure env is loaded (for PORT, etc.)
dotenv.config();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" }, serveClient: false });

initSockets(io);

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_URL =
  process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:5173";

httpServer.listen(PORT, () => {
  // Avoid printing a clickable backend URL to reduce confusion
  console.log(`API server listening on port ${PORT} (backend)`);
  console.log(`Open the app at ${FRONTEND_URL}`);
});
