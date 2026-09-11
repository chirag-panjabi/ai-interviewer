# 📐 Interactive Architecture Diagram Suite

This directory contains the production-grade, interactive architecture visualization suite for the **AI Technical Interviewer** platform, authored with **Archify** (`quality_profile: "showcase"`).

Every diagram is rendered as a standalone, zero-dependency interactive HTML artifact featuring:
- **Interactive Pan & Zoom**: Smooth canvas navigation for complex system inspection.
- **Guided View Presets**: Clickable scenario filters highlighting specific subsystem paths.
- **Light & Dark Theme Toggle**: High-contrast rendering matching any presentation or review environment.
- **Evidence Verification**: Automated headless Chrome visual regression captures across 1440×900 and 2048×1320 resolutions in both themes.

---

## 🚀 Quick Launch

To open any diagram directly in your default browser on macOS:

```bash
# 1. High-Level Architecture (Primary Path & Trust Boundaries)
open diagrams/high-level-architecture.html

# 2. System End-to-End Architecture
open diagrams/system-architecture.html

# 3. Real-Time Audio Streaming & Interruption Handling
open diagrams/realtime-audio-streaming.html

# 4. 5-Rubric Evaluation & Fallback Engine
open diagrams/evaluation-fallback-pipeline.html

# 5. Request Lifecycle (Auth, Cache, Fallback & Async Trace)
open diagrams/request-flow.html

# 6. Async Roundtrip (Ack, Enqueue, Retry, Callback/Poll)
open diagrams/async-roundtrip.html

# 7. Session Lifecycle & 30s Grace State Machine
open diagrams/interview-session.html
```

---

## 🗺️ Diagram Catalog & Architectural Focus

| # | Diagram | Type | Primary File | Core Engineering Concepts |
|---|---------|------|--------------|---------------------------|
| 1 | **High-Level Architecture** | `architecture` | [`high-level-architecture.html`](./high-level-architecture.html) | 10 core runtime components, highlighted primary audio path, 4 explicit trust boundaries, supporting detail in cards |
| 2 | **System Architecture** | `architecture` | [`system-architecture.html`](./system-architecture.html) | Client Audio DSP, WebSocket gateway, PostgreSQL Prisma adapter, Gemini Live API boundary |
| 3 | **Request Lifecycle Flow** | `sequence` | [`request-flow.html`](./request-flow.html) | Caller-to-response request trace, Auth Guard verification, cache miss, PostgreSQL persistence fallback, async pre-warm event |
| 4 | **Async Roundtrip Flow** | `sequence` | [`async-roundtrip.html`](./async-roundtrip.html) | Fast 202 ack, background queueing, LLM retry/fallback, dual notification (WebSocket push + REST poll) |
| 5 | **Real-Time Audio Streaming** | `sequence` | [`realtime-audio-streaming.html`](./realtime-audio-streaming.html) | Full-duplex PCM 16kHz capture, 24kHz playback, user barge-in / interruption, asynchronous DB write queue |
| 6 | **Evaluation Fallback Pipeline** | `workflow` | [`evaluation-fallback-pipeline.html`](./evaluation-fallback-pipeline.html) | 5-rubric parallel evaluation, markdown extraction, schema validation, deterministic heuristic fallback |
| 7 | **Session Lifecycle State Machine** | `lifecycle` | [`interview-session.html`](./interview-session.html) | State progression from Intake to Dossier, 30s socket hold grace period, Wi-Fi blip reattachment |

---

## 1. High-Level Architecture (`high-level-architecture.html`)

A focused high-level architecture diagram featuring **10 core runtime components**, one prominent **primary real-time voice loop**, **4 explicit ownership/trust boundaries**, and rich architectural depth concentrated in supporting cards:

- **10 Core Runtime Components**:
  1. `client_ui`: React 19 Client UI (Candidate setup, Voice Orb visualizer, session state)
  2. `audio_dsp`: Web Audio DSP Engine (Linear interpolation downsampler to 16kHz mono PCM)
  3. `audio_store`: IndexedDB Cache (Local WebM storage with synthetic EBML header repair)
  4. `api_router`: Express API Gateway (IP rate-limiting, GitHub intake validation)
  5. `ws_gateway`: Gemini Live Proxy (Full-duplex WebSocket hub, 30s disconnect grace manager)
  6. `eval_engine`: Evaluation Engine (Post-interview 5-rubric evaluation with heuristic fallback)
  7. `postgres_db`: PostgreSQL DB (Prisma Client persistence for sessions, turns, and scores)
  8. `github_api`: GitHub REST API (Candidate repository analysis and codebase context)
  9. `gemini_live`: Gemini Multimodal Live API (Sub-second bidirectional audio streaming)
  10. `gemini_flash`: Gemini Flash API (Structured JSON rubric grading)

- **4 Ownership & Trust Boundaries**:
  - `Candidate Browser Environment (Untrusted Client)`: Wraps `client_ui`, `audio_dsp`, `audio_store`. Isolated browser runtime; zero API keys or DB credentials exposed.
  - `Application Gateway & Backend (Trusted Runtime)`: Wraps `api_router`, `ws_gateway`, `eval_engine`. Server-side Node/Bun environment managing upstream credentials, rate limiting, and in-memory grace windows.
  - `Persistence Tier (PostgreSQL)`: Wraps `postgres_db`. Protected database tier with composite indices and transactional turn serialization.
  - `External Managed Services (Cloud APIs)`: Wraps `github_api`, `gemini_live`, `gemini_flash`. Third-party cloud intelligence providers.

- **Primary Request / Data Path**:
  - `client_ui` ──► `audio_dsp` ──(16kHz PCM WSS)──► `ws_gateway` ──(bidi audio stream)──► `gemini_live` (prominently emphasized with zero intersecting routes).

- **Guided Views Available**:
  1. **Primary Voice Loop**: Sub-second bidirectional conversational audio streaming loop.
  2. **Candidate Intake & Setup**: Candidate onboarding, GitHub codebase scraping, and session creation.
  3. **Evaluation & Persistence**: Post-session 5-rubric grading cascade and dual-tier audio/dossier persistence.

---

## 2. System Architecture (`system-architecture.html`)

An end-to-end multi-tier architecture mapping the client frontend, Node/Bun WebSocket server, PostgreSQL persistence layer, and upstream Google Gemini foundation models.

- **Client Tier**: Web Audio API DSP pipeline (`audioProcessor.ts`, `AudioWorkletNode`), EBML-repaired WebM storage in IndexedDB, React 19 UI with real-time waveform visualization.
- **Backend Tier**: Express WebSocket server (`geminiLive.ts`), GitHub intelligence parser (`github.ts`), and evaluation engine (`evaluation.ts`).
- **Data Tier**: PostgreSQL database interfaced via Prisma Client with UUID primary keys and composite turn indexes (`[interviewId, turnIndex]`).
- **External Services**: Gemini 3.1 Flash Live Preview (WebSockets) and Gemini 2.5 Flash (REST evaluation).

### Guided Views Available:
1. **End-to-End System**: Full view of all client, backend, database, and cloud components.
2. **Audio Streaming Loop**: Direct pipeline from Candidate Mic → Express WSS Gateway → Gemini Live.
3. **Evaluation Engine**: Flow from interview completion → transcript extraction → 5 rubric scoring → PostgreSQL dossier.

---

## 3. Request Lifecycle Flow (`request-flow.html`)

A sequence diagram modeling a complete candidate request from initial caller submission to final response, incorporating authentication, cache miss, persistence fallback, return messages, and asynchronous event decoupling:

- **Participants**:
  - `caller` (Candidate Browser Session)
  - `web` (React App / `Form.tsx`)
  - `api` (Express 5 API Gateway)
  - `auth` (Auth Guard / Rate Limiter & BYOK Key Verifier)
  - `cache` (In-Memory Candidate Profile Cache with 10m TTL)
  - `db` (PostgreSQL / Prisma Session Store)
  - `trace` (Event Bus / Asynchronous Telemetry & Socket Pre-Warm)

- **3 Sequential Phases**:
  1. **Intake & Auth**: Candidate submits intake form; API Gateway routes to Auth Guard to verify IP rate limit budget and Google Gemini API key authenticity.
  2. **Cache Miss & Persistence Fallback**: API checks in-memory cache for existing candidate profile; on cache miss, cascades to PostgreSQL to commit ground-truth session record.
  3. **Async Trace & Final Response**: Gateway writes back to cache, emits non-blocking async pre-warm event to Event Bus to preheat the Gemini Live WebSocket, and returns `201 Created { id }` to caller.

- **Guided Views Available**:
  1. **Request & Identity**: Intake payload validation against IP rate limits and API key authenticity.
  2. **Cache & Persistence Fallback**: In-memory cache miss triggering database persistence fallback.
  3. **Async Trace & Final Response**: Non-blocking pre-warm event dispatching while returning HTTP 201 to the caller.

---

## 4. Real-Time Audio Streaming & Interruption Handling (`realtime-audio-streaming.html`)

A millisecond-accurate sequence diagram illustrating full-duplex conversational voice mechanics and barge-in handling.

### Key Architectural Invariants:
1. **Low-Latency Streaming**: Candidate audio is downsampled in the browser to 16kHz mono PCM and streamed over binary WebSocket frames directly to the backend.
2. **Duplex Synthesis**: Gemini Live streams 24kHz PCM audio back to the client while simultaneously sending transcript deltas.
3. **Client Barge-In (Interruption)**: When the candidate starts speaking while the interviewer is talking:
   - Client cuts audio playback buffer immediately.
   - Client emits `realtime_input` containing candidate speech.
   - Gemini detects barge-in, aborts model turn, and emits `serverContent.interrupted = true`.
   - Backend marks `wasInterrupted: true` in the DB persistence queue and halts audio delivery.
4. **Non-Blocking Turn Serialization**: Backend chains DB writes using `dbWriteQueue = dbWriteQueue.then(...)`, ensuring turn sequence order without delaying real-time audio packets.

### Guided Views Available:
1. **Full Flow**: Complete session setup, bidirectional turn exchange, and completion.
2. **Streaming & Interruption**: Audio capture, playback, and candidate barge-in interruption.
3. **Turn Persistence**: Asynchronous turn sequence numbering and PostgreSQL write queuing.

---

## 3. 5-Rubric Evaluation Fallback Pipeline (`evaluation-fallback-pipeline.html`)

A robust workflow diagram showcasing the zero-failure evaluation pipeline that grades candidates across 5 core engineering dimensions.

### The 5 Evaluation Rubrics:
1. **System Architecture**: Modularity, data modeling, trade-offs, and scalability.
2. **Code Quality**: Idiomatic patterns, typing, error boundaries, and defensive design.
3. **Problem Solving**: Algorithmic reasoning, edge-case mitigation, and debugging.
4. **Communication**: Concise articulation, technical terminology, and active listening.
5. **System Design & Performance**: Latency, bottlenecks, database indexing, and caching.

### Deterministic Fallback Architecture:
- **Primary Path**: Structured prompt with JSON response schema → Markdown fence stripping → `JSON.parse()` → Zod schema validation → Final Dossier.
- **Defensive Fallback Path**: If the LLM generates conversational text or malformed JSON:
  - Regex pattern matcher extracts nested JSON blocks or key-value score pairs (`/score["':\s]+([0-9]+)/i`).
  - If still invalid, a deterministic heuristic scoring algorithm analyzes transcript word count, turn ratio, technical keyword density, and sentiment to synthesize a grounded fallback scorecard.
  - Guarantees the candidate never loses their evaluation dossier due to upstream LLM formatting quirks.

### Guided Views Available:
1. **Full Pipeline**: Complete workflow from transcript extraction to dossier storage.
2. **Happy Path**: Direct LLM evaluation, schema parsing, and database persistence.
3. **Defensive Fallback**: Error boundary routing, regex salvage, and heuristic scoring fallback.

---

## 4. Candidate Session Lifecycle State Machine (`interview-session.html`)

A 3-lane lifecycle state machine modeling the complete candidate journey and connection resiliency boundaries.

```
Lane 01 / Session Phases:
[Created] ──► [Pre-Warm] ──► [In-Progress] ──► [Evaluating] ──► [Completed]
                                   │                  │
Lane 02 / Resilience:              ▼ (socket drop)    ▼ (parse error)
                             [Grace Window]    [Heuristic Rescue]
                              (30s hold)         (regex fallback)
                               │       ▲              │         ▲
Lane 03 / Terminal:            ▼       │              ▼         │
                          [Abandoned]  └── reconnect  [Failed]  └── rescued
                          (timeout)    (< 30s)        (fatal)
```

### Key Resiliency Guarantees:
1. **30-Second In-Memory Grace Window**: If a candidate refreshes the page or experiences a temporary Wi-Fi drop during an interview:
   - Backend detects client WebSocket closure (`ws.on("close")`).
   - Rather than terminating the session, backend starts a 30s countdown: `sessionObj.graceTimeout = setTimeout(cleanup, 30000)`.
   - The upstream Gemini Live WebSocket connection is kept open and active in memory.
2. **Seamless Reconnection**: When the candidate reloads within 30s, the client opens a new WebSocket with the same `interviewId`. The backend cancels the grace timer, reattaches the socket, and streaming resumes with zero context loss.
3. **Clean Teardown**: If 30s elapse without reconnection, the grace timer fires `cleanup()`, gracefully closing the Gemini socket and releasing memory.

---

## 🛠️ Verification & Quality Profile

All diagrams are authored to Archify's `showcase` standard and verified across 9 automated checks:
1. `single_svg`: Single clean SVG container with valid XML namespaces.
2. `finite_svg`: Finite, non-NaN coordinate geometry.
3. `orthogonal_arrows`: Clean Manhattan orthogonal routing with zero diagonal skew.
4. `label_route_clearance`: Minimum clearance between labels and adjacent routes.
5. `relationship_crossings`: Zero unintended line intersections.
6. `relationship_corridors`: Clean separation between parallel connection channels.
7. `container_border_runs`: Routing channels strictly respect component boundaries.
8. `route_rhythm`: Minimum segment run-ups before and after bends.
9. `legend_clearance`: Legend swatches and labels clear all canvas geometry.

Visual verification sidecars (`.visual-check.json`, `.visual-check.html`, and light/dark PNG screenshots) are preserved in this directory for auditability.
