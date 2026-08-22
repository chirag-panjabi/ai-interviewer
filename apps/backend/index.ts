import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { WebSocketServer, WebSocket } from "ws";
import { config, validateConfig } from "./config";
import { prisma } from "./db";
import { generalLimiter } from "./middleware/rateLimiter";
import { interviewRouter } from "./routes/interview";
import { handleGeminiLiveSession } from "./services/geminiLive";

validateConfig();

const app = express();

// Trust reverse proxies (Render, Cloudflare, Vercel) for accurate client IP rate limiting
app.set("trust proxy", 1);

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// Middleware
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("https://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.startsWith("https://127.0.0.1:") ||
        /^https?:\/\/192\.168\./.test(origin) ||
        /^https?:\/\/10\./.test(origin) ||
        /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./.test(origin) ||
        origin.endsWith(".vercel.app") ||
        origin === config.CORS_ORIGIN
      ) {
        return callback(null, true);
      }
      callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With", "Range"],
    credentials: true,
  })
);

// General API Rate Limiting (100 req/min per IP)
app.use("/api/", generalLimiter);

// Deep Health & Telemetry Check
const healthHandler = async (_: express.Request, res: express.Response) => {
  let dbStatus = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }

  const memory = process.memoryUsage();
  const isHealthy = dbStatus === "connected";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    services: {
      database: dbStatus,
      geminiLiveModel: config.GEMINI_LIVE_MODEL,
      geminiEvalModel: config.GEMINI_EVAL_MODEL,
    },
    memory: {
      rssMB: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
    },
  });
};

app.get("/health", healthHandler);
app.get("/healthz", healthHandler);

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
