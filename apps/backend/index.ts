import http from "node:http";
import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { config, validateConfig } from "./config";
import { interviewRouter } from "./routes/interview";
import { handleGeminiLiveSession } from "./services/geminiLive";

validateConfig();

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or dev tools)
      if (!origin) return callback(null, true);
      // In development, allow localhost origins
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }
      if (origin === config.CORS_ORIGIN) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
  })
);

// Health check
app.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/v1", interviewRouter);

// HTTP Server
const server = http.createServer(app);

// WebSocket Server for Gemini Multimodal Live streaming
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  const pathname = url.pathname;

  // Match /api/v1/live/:interviewId or /api/v1/live?interviewId=...
  const match = pathname.match(/^\/api\/v1\/live\/([^/]+)$/);
  const interviewId = match ? match[1] : url.searchParams.get("interviewId");

  if (interviewId) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, interviewId);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws: WebSocket, _request: http.IncomingMessage, interviewId: string) => {
  console.log(`[WebSocket] Client connected for live interview: ${interviewId}`);
  handleGeminiLiveSession(ws, interviewId);
});

server.listen(config.PORT, () => {
  console.log(`🚀 AI Interviewer Backend running on http://localhost:${config.PORT}`);
  console.log(`🎙️  Gemini Live Model: ${config.GEMINI_LIVE_MODEL}`);
  console.log(`📊 Gemini Eval Model: ${config.GEMINI_EVAL_MODEL}`);
});
