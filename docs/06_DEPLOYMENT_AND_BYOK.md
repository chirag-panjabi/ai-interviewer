# 06 — Deployment, Configuration & BYOK Security Architecture

## 1. Environment Configuration

### Backend Environment Variables (`apps/backend/.env`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | String | *Required* | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/ai_interviewer`). |
| `GEMINI_API_KEY` | String | *Required* | Default hosted Google Gemini API key used for demo tier and fallback evaluations. |
| `GEMINI_LIVE_MODEL` | String | `gemini-3.1-flash-live-preview` | Model name used for low-latency live WebSocket voice streaming. |
| `GEMINI_EVAL_MODEL` | String | `gemini-flash-latest` | Model name used for post-interview structured evaluation grading. |
| `PORT` | Number | `3001` | HTTP and WebSocket server listening port. |
| `CORS_ORIGIN` | String | `http://localhost:3000` | Allowed web origin for CORS policies. |
| `GITHUB_TOKEN` | String | *Optional* | GitHub Personal Access Token (increases GitHub API limit from 60 to 5,000 req/hr). |
| `DEMO_DAILY_INTERVIEW_LIMIT`| Number | `15` | Maximum number of hosted demo interviews allowed per IP address within the window. |
| `DEMO_RATE_LIMIT_WINDOW_HOURS`| Number | `24` | Rate limit sliding window duration in hours. |
| `GENERAL_API_RATE_LIMIT_PER_MIN`| Number | `100` | General anti-DDoS rate limit for REST endpoints per IP per minute. |

---

### Frontend Environment Variables (`apps/frontend/.env`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_BACKEND_URL` | String | `http://localhost:3001` | Backend HTTP API base URL (automatically falls back to relative/dynamic port resolution). |
| `BUN_PUBLIC_BACKEND_URL` | String | *Optional* | Build-time backend URL when bundled via `bun run build`. |

---

## 2. Production Deployment Topologies

```mermaid
flowchart LR
    subgraph Edge ["Global Edge Tier"]
        Vercel["Frontend SPA (Vercel Edge Network)"]
    end

    subgraph Compute ["Backend Compute Tier"]
        Render["Node.js / Bun Container (Render / Fly.io / AWS ECS)"]
    end

    subgraph Data ["Managed Database"]
        NeonPostgres[("PostgreSQL Database (Neon / Supabase / AWS RDS)")]
    end

    subgraph AICloud ["Google Cloud"]
        GeminiLiveAPI["Gemini Multimodal Live API (wss://...)"]
    end

    Vercel -->|"HTTPS REST API"| Render
    Vercel -->|"WSS Low-Latency Voice"| Render
    Render -->|"Connection Pooling"| NeonPostgres
    Render <-->|"Direct WSS Stream"| GeminiLiveAPI
```

### A. Frontend Deployment (Vercel)
- **Framework Preset**: Vite
- **Root Directory**: `apps/frontend`
- **Build Command**: `bun run build` (or `npm run build`)
- **Output Directory**: `dist`
- **Environment Variables**: Set `VITE_BACKEND_URL` to your production backend URL (e.g. `https://api.yourdomain.com`).

---

### B. Backend Deployment (Render / Docker)
- **Build Command**: `cd apps/backend && bun install && bunx prisma generate`
- **Start Command**: `cd apps/backend && bun run index.ts`
- **Docker Support**: A production-ready multi-stage Dockerfile is provided in `apps/backend/Dockerfile`.

---

## 3. Bring-Your-Own-Key (BYOK) Security Architecture

To allow unlimited candidate practice without depleting hosted server quotas, the platform provides a zero-friction **Bring Your Own Key** model for Google Gemini API keys.

```mermaid
sequenceDiagram
    participant User as Candidate
    participant Modal as ApiKeyModal.tsx
    participant Store as localStorage (Browser)
    participant API as Backend (/api/v1)
    participant Google as Google AI Studio

    User->>Modal: Enters Gemini Key (AIzaSy...)
    Modal->>API: POST /verify-key { apiKey }
    API->>Google: GET /v1beta/models?key=...
    Google->>API: 200 OK (models: [...])
    API->>Modal: { valid: true, modelsCount: 12 }
    Modal->>Store: Save to localStorage ("ai_interviewer_gemini_key")
    
    Note over User,Store: Key is NEVER saved in backend database

    User->>API: POST /pre-interview [Header: x-gemini-api-key]
    Note over API: Bypasses daily rate limiter
    User->>API: WS /api/v1/live/:id [Header / Query: apiKey]
    API->>Google: Opens Gemini Live using candidate key
```

---

### Privacy & Security Guarantees:
1. **Client-Side Storage**: Keys are stored exclusively in the browser's `localStorage` (`ai_interviewer_gemini_key`).
2. **Zero Plaintext Server Logging**:
   - In all server logs, API keys are permanently masked using `maskKey()` (e.g. `AIzaSy...9xQ`).
   - Raw keys are never written to stdout, stderr, or log aggregators.
3. **Zero Database Persistence**:
   - The PostgreSQL schema contains no fields for candidate API keys.
   - Keys exist strictly in transient request memory for the duration of the active WebSocket connection.
4. **Instant Revocation**:
   - Clearing the key in the UI immediately removes it from browser storage and reverts to the hosted demo tier.
