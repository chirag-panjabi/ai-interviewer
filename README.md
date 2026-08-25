# 🎙️ AI Technical Interviewer (100% Free-Tier Multimodal Voice AI)

[![React 19](https://img.shields.io/badge/React-19-blue?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Runtime-Bun-fbf0df?logo=bun&logoColor=black)](https://bun.sh/)
[![Express 5](https://img.shields.io/badge/Backend-Express_5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Google Gemini Live](https://img.shields.io/badge/Voice_AI-Gemini_Live_API-4285F4?logo=google&logoColor=white)](https://aistudio.google.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-grade, real-time voice technical screening platform powered by Google's **Gemini Multimodal Live API** (`gemini-3.1-flash-live-preview`) and structured candidate evaluation with **`gemini-flash-latest`**.

Built with a high-performance modern full-stack architecture (**React 19**, **Bun**, **Express 5**, **PostgreSQL**, **Prisma**, **Web Audio API**), providing zero-cost, ultra-low-latency, bidirectional audio conversations with native barge-in interruptions and deep project-grounded technical probing.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React 19 + Tailwind CSS + Web Audio API)"]
        Workbench["Setup Workbench & Repo Selector<br/>(URL Detection, Starred Cards, Track Picker)"]
        AudioConsole["Studio Audio Readiness Console<br/>(Live Diagnostics, 7-Band Parametric EQ)"]
        Mic["Microphone Stream<br/>(16kHz Mono Int16 PCM)"]
        Player["Live Audio Player<br/>(24kHz PCM Scheduling + Barge-in Interruption)"]
        Scorecard["Evaluation Report Dossier<br/>(Rubric Rail, Quotes, Transcript Search)"]
        BYOKModal["Precision BYOK Security Dialog<br/>(Live Pre-flight Key Validation)"]
    end

    subgraph Server["Backend Server (Bun + Express 5 + WebSocket Relay)"]
        RESTRouter["REST API Router (/api/v1/*)<br/>(GitHub Scraper, Key Verifier, Session Init)"]
        WSServer["WebSocket Gateway (/api/v1/live/:id)<br/>(Heartbeat, Barge-in Relay, Stream Sync)"]
        PromptEngine["Prompt Engine (promptBuilder.ts)<br/>(2-Sentence Cadence & 3-Layer Depth Drill)"]
        EvalEngine["Evaluation Service (evaluation.ts)<br/>(Dynamic First-Principles Rubric Analysis)"]
        RateLimiter["Adaptive Rate Limiter<br/>(Configurable Demo Quotas & IP Protection)"]
        DB[(PostgreSQL + Prisma ORM)]
    end

    subgraph GoogleAI["Google Gemini Cloud"]
        LiveAPI["Gemini Multimodal Live API<br/>(gemini-3.1-flash-live-preview)<br/>Bi-directional Native Audio-to-Audio"]
        EvalModel["Gemini Flash Latest<br/>Structured JSON Rubric Synthesis"]
    end

    Workbench -->|POST /api/v1/github-preview| RESTRouter
    Workbench -->|POST /api/v1/pre-interview| RESTRouter
    BYOKModal -->|POST /api/v1/verify-key| RESTRouter
    RESTRouter --> DB

    AudioConsole -->|Connect WS + BYOK Header| WSServer
    Mic -->|Base64 16kHz PCM Chunks| WSServer
    WSServer -->|Bidi WebSocket Handshake| LiveAPI
    LiveAPI -->|24kHz Audio Buffers + outputTranscription| WSServer
    WSServer -->|Audio Chunks + Synchronized Captions| Player
    Player --> AudioConsole

    LiveAPI -->|Streaming Turns & Transcripts| DB
    WSServer -->|Trigger Post-Call Evaluation| EvalModel
    EvalModel -->|Structured JSON Scorecard| DB
    Scorecard -->|GET /api/v1/result/:id| RESTRouter
```

---

## ✨ Key Engineering Highlights

### 1. 🎙️ Full-Duplex Multimodal Voice Architecture
- **Direct Audio-to-Audio Streaming**: Utilizes Google's Gemini Live API (`gemini-3.1-flash-live-preview`) over bidirectional WebSockets, bypassing traditional 3-hop cascaded pipelines (STT $\rightarrow$ LLM $\rightarrow$ TTS) to achieve sub-350ms P95 turnaround.
- **Low-Latency Audio Pipeline**: Captures 16kHz mono Int16 PCM via Web Audio API, resamples in real time, and schedules gapless 24kHz output buffers.
- **Client-Side Barge-In Interruption**: Continuously monitors microphone RMS energy to instantly flush and cancel queued audio buffers when the candidate speaks.
- **Zero-Cost Dual-Track Session Recording**: Mixes candidate microphone and AI voice in the native Web Audio DSP graph with 2s timeslice streaming, dynamic codec negotiation (`.m4a` / `.webm`), EBML duration patching (crbug/642012), and IndexedDB LRU 5-session caching.

### 2. 🗣️ Conversational Engine & Cadence Control
- **Structured 2-Sentence Turn Formula**:
  - *Sentence 1 (Micro-Grounding $\le 8$ words)*: Brief acknowledgement of the candidate's last point.
  - *Sentence 2 (Probing Question)*: Single focused technical question targeting mechanics, trade-offs, or failure modes.
  - *Airtime Governance*: Keeps interviewer speech to $<20\%$ of session time, preventing AI monologues and audio packet collisions.
- **Adaptive Depth & Breadth Probing**: Drills into sub-components while new technical signal is produced, then pivots across architectural dimensions (storage $\rightarrow$ concurrency $\rightarrow$ failure blast radius $\rightarrow$ event streams) to ensure comprehensive evaluation.
- **Concrete Technical Grounding**: Redirects high-level abstractions (*"we followed agile best practices"*) into specific database schemas, lock mechanisms, and concurrency primitives.
- **Voice Protocol & Boundary Handling**: Accommodates candidate contemplation pauses (*"Take your time"*), filters passive backchanneling (*"Yeah"*, *"Right"*), and normalizes phonetic speech-to-text approximations (*"post grass"* $\rightarrow$ PostgreSQL).

### 3. 🧠 Dynamic Multi-Track Depth Generator & Seniority Matrix
- **Featured 360° Full Mock Loop (`FULL_MOCK_SCREEN`)**: Simulates a complete FAANG/Tier-1 interview cycle: 60s Intro $\rightarrow$ Flagship Project Deep-Dive $\rightarrow$ Live System Scenario $\rightarrow$ Behavioral $\rightarrow$ Candidate Reverse Q&A.
- **8 Specialized Technical Tracks**: Full-Stack, Backend, Frontend, System Design, DSA, Behavioral, DevOps & Cloud, and ML/AI.
- **Seeded Production Scenario Archetypes**: 27 real-world system challenges (e.g. multi-tenant rate limiters, distributed payment ledgers, zero-downtime database migrations, HNSW vector indexing) tailored dynamically by seniority level.
- **3-Layer Depth Model**: Probes every topic across Architectural Decision $\rightarrow$ Under-the-Hood Mechanics (B-Trees, locks, event loops, WAL) $\rightarrow$ Production Pressures (10x traffic, network partitions, cascading failures).

### 4. 🎯 Repository Context Ingestion & Project Grounding
- **4-Way Selection Workflow**: Supports direct GitHub repository URLs, top starred repository cards, custom repository names, or domain-only screens.
- **In-Memory LRU Cache (10-min TTL)**: Prevents hitting GitHub unauthenticated rate limits (60 req/hr).
- **Sandboxed Context Extraction**: Sanitizes chosen project READMEs (up to 2,000 chars) and isolates them inside XML delimiters to prevent prompt injection.

### 5. ⚖️ Objective Candidate Evaluation Engine
- **Verbatim Evidence Grounding**: Generates structured JSON scorecards backed by direct transcript quotes across 4 core dimensions (Technical Accuracy, Problem Solving, Communication, Systems Depth).
- **Technical Accuracy Threshold**: Automatically caps hiring recommendations at `Lean No Hire` / `No Hire` if core technical accuracy is below $4.5/10$, ensuring communication polish cannot override technical gaps.
- **Originator Attribution**: Awards technical depth credit only when concepts originate from the candidate, ignoring interviewer-spoonfed answers.
- **Candidate Q&A Isolation**: Isolates reverse Q&A turns so architectural explanations provided by the interviewer are not mistakenly credited to candidate knowledge.

### 6. 🛡️ Security, Quota Management & BYOK
- **Hosted Cloud Demo**: 1-click evaluation out of the box with configurable IP sliding-window rate limits (`DEMO_DAILY_INTERVIEW_LIMIT=15`).
- **Bring-Your-Own-Key (BYOK)**: Supports candidate-provided Google AI Studio keys with live pre-flight validation, client-only persistence, and zero rate limits.

---

## 🧭 Supported Technical Tracks & Seniority Matrix

| Technical Focus Track | Primary Architectural Focus & Evaluation Drill |
| :--- | :--- |
| **⭐ Full Mock Interview Screen** | **Flagship 360° Simulation**: 60s Intro $\rightarrow$ Flagship Project Deep-Dive $\rightarrow$ Live System Scenario $\rightarrow$ Behavioral $\rightarrow$ Candidate Reverse Q&A |
| **Full-Stack General** | End-to-end API lifecycle, state management, cache hierarchies, database schema design, and full-stack performance |
| **Backend Engineering** | Concurrency, REST/gRPC API contracts, DB indexing, storage engines (LSM/B-Tree), message queues, and distributed locks |
| **Frontend Engineering** | Component architecture, Core Web Vitals (LCP/INP/CLS), SSR/hydration, state machines, and DOM rendering mechanics |
| **System Design** | High-scale topologies, capacity estimation, consistent hashing, database sharding, fault tolerance, and disaster recovery |
| **DSA & Algorithms** | Problem clarification, constraint analysis, optimal data structures (Heaps, Trees, Hash Tables), and Big-O bounds |
| **Behavioral & Culture** | STAR method storytelling, technical ownership, handling ambiguity, resolving engineering disagreements, and post-mortems |
| **DevOps & Cloud** | CI/CD automation, Docker/Kubernetes orchestration, Terraform IaC, service meshes, observability (OTel), and cloud cost governance |
| **ML & AI Engineering** | End-to-end ML pipelines, feature stores, embedding search (HNSW), model serving latency, and LLM agent orchestration |

### Seniority Calibration
- **Junior / Entry (0–2 yrs)**: Focus on syntax correctness, core data structures, API contracts, and basic error handling.
- **Mid-Level (2–5 yrs)**: Focus on architectural patterns, edge cases, caching layers, database indexing, and async flows.
- **Senior / Staff (5+ yrs)**: Focus on mechanical sympathy, distributed trade-offs, zero-downtime migrations, and disaster recovery.

---

## 📡 API Reference

### REST Endpoints (`/api/v1`)

| Method | Endpoint | Description | Auth / Headers |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/github-preview` | Scrapes public repos & README preview for target username | Optional `GITHUB_TOKEN` |
| `POST` | `/api/v1/verify-key` | Fast live ping check validating Google Gemini API keys | `apiKey` in JSON body |
| `POST` | `/api/v1/pre-interview` | Initializes interview session with track, seniority, repo | `x-gemini-api-key` (optional) |
| `GET` | `/api/v1/result/:id` | Polls interview status and retrieves structured scorecard | None |
| `GET` | `/health` | Deep health check (DB status, models, memory, demo quota) | None |

### WebSocket Gateway (`/api/v1/live/:interviewId`)

- **Subprotocol**: Native bidirectional JSON + PCM audio streaming.
- **Client $\rightarrow$ Server**:
  - `{"type": "audio", "pcm": "<base64_16khz_pcm>"}` — Candidate microphone stream.
  - `{"type": "ping"}` — 15s connection keep-alive.
  - `{"type": "end"}` — Clean session termination and evaluation trigger.
- **Server $\rightarrow$ Client**:
  - `{"type": "ready", "model": "gemini-3.1-flash-live-preview"}` — Live session established.
  - `{"type": "audio", "pcm": "<base64_24khz_pcm>"}` — Synthesized interviewer voice chunks.
  - `{"type": "transcript", "role": "assistant"|"user", "text": "..."}` — Synchronized live captions.
  - `{"type": "interrupt"}` — Barge-in event clearing active audio buffers.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Radix UI, Lucide Icons, React Router v7 |
| **Audio Engine** | Web Audio API, `ScriptProcessorNode` / `AudioContext`, Int16/Float32 PCM pipeline, 7-band parametric EQ |
| **Backend** | Bun runtime, Express 5, `ws` WebSocket Server, Zod validation |
| **Database & ORM** | PostgreSQL, Prisma ORM with typed relations and cascade constraints |
| **AI Models** | `gemini-3.1-flash-live-preview` (Voice Live API) & `gemini-flash-latest` (Structured Evaluation) |
| **Package Management** | Turborepo, Bun workspaces |

---

## 🚀 Local Setup Guide

### 📋 Prerequisites

1. **[Bun](https://bun.sh)** (v1.2 or higher):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
2. **PostgreSQL Database** (Local instance or free cloud database like [Neon](https://neon.tech) or [Supabase](https://supabase.com)).
3. **Google Gemini API Key**:
   - Grab a free key from [Google AI Studio](https://aistudio.google.com).

---

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/chirag-panjabi/ai-interviewer.git
cd ai-interviewer
bun install
```

---

### 2. Configure Environment Variables

Create a `.env` file in the root directory (or in `apps/backend/.env`):

```env
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_interviewer"

# Google Gemini API Key (Required for Voice & Evaluation)
GEMINI_API_KEY="your_gemini_api_key_here"

# Model Configurations (Defaults to free tier)
GEMINI_LIVE_MODEL="gemini-3.1-flash-live-preview"
GEMINI_EVAL_MODEL="gemini-flash-latest"

# Server Ports & CORS
PORT=3001
CORS_ORIGIN="http://localhost:3000"
BUN_PUBLIC_BACKEND_URL="http://localhost:3001"

# Rate Limits & Hosted Demo Quota (Adjust anytime in Render/local env)
DEMO_DAILY_INTERVIEW_LIMIT=15
DEMO_RATE_LIMIT_WINDOW_HOURS=24
GENERAL_API_RATE_LIMIT_PER_MIN=100

# Optional: Increases GitHub API rate limit from 60 to 5,000 req/hr
# GITHUB_TOKEN="ghp_your_personal_access_token"
```

---

### 3. Initialize the Database Schema

Run Prisma to generate the TypeScript client and push the database schema to your PostgreSQL instance:

```bash
cd apps/backend
bunx prisma generate
bunx prisma db push
cd ../..
```

---

### 4. Run Locally in Development Mode

Run backend and frontend concurrently from the root directory:

```bash
bun run dev
```

Or run them in separate terminal tabs:

**Terminal 1 (Backend - Port 3001):**
```bash
cd apps/backend
bun run dev
```

**Terminal 2 (Frontend - Port 3000):**
```bash
cd apps/frontend
bun run dev
```

---

### 5. Access the Application

- **Frontend Application**: Open [http://localhost:3000](http://localhost:3000) in your browser.
- **Backend API**: Running at [http://localhost:3001](http://localhost:3001).

---

## ☁️ Production Deployment on Render

This repository includes a [`render.yaml`](render.yaml) blueprint configured for zero-downtime deployment:

1. Push your repository to GitHub.
2. In the **[Render Dashboard](https://dashboard.render.com)**, click **New +** $\rightarrow$ **Blueprint**.
3. Connect your repository. Render will automatically provision:
   - **`ai-interviewer-backend`**: Node/Bun Web Service with native WebSocket support.
   - **`ai-interviewer-frontend`**: Static Site with client-side SPA routing rewrites.
4. Set `DATABASE_URL` and `GEMINI_API_KEY` in the Render dashboard environment settings.

---

## 📚 Technical Documentation Suite

For exhaustive implementation details, state machines, and operational runbooks, refer to the documentation:

| Document | Topic & Focus Area |
| :--- | :--- |
| [**01. System Architecture**](docs/01_SYSTEM_ARCHITECTURE.md) | High-level topology, monorepo layout, end-to-end data flows, and design principles. |
| [**02. Frontend Deep Dive**](docs/02_FRONTEND_DEEP_DIVE.md) | React components (`Form`, `Interview`, `Result`), Web Audio API pipeline, PCM streaming & playback. |
| [**03. Backend Deep Dive**](docs/03_BACKEND_DEEP_DIVE.md) | Express HTTP routes, WebSocket gateway, Gemini Live integration, and GitHub ingestion engine. |
| [**04. AI Prompting & Evaluation**](docs/04_AI_PROMPTING_AND_EVAL.md) | Staff Engineer Alex persona, 14 conversational invariants, 3-layer depth drill, and Tier-1 rubrics. |
| [**05. Database & State Flow**](docs/05_DATABASE_AND_STATE_FLOW.md) | PostgreSQL schema, Prisma models, interview lifecycle state machine, and asynchronous turn persistence. |
| [**06. Deployment & BYOK Architecture**](docs/06_DEPLOYMENT_AND_BYOK.md) | Environment configuration, Vercel/Render hosting topologies, and Bring-Your-Own-Key security. |
| [**07. Troubleshooting & Runbook**](docs/07_TROUBLESHOOTING_RUNBOOK.md) | Diagnostic runbooks for common failures, local test scripts, and operational recovery commands. |
| [**08. API & WebSocket Reference**](docs/08_API_REFERENCE.md) | Complete reference for REST endpoints, schemas, real-time WebSocket protocol frames, and SDK integration examples. |
| [**09. Benchmarks & Evaluation Metrics**](docs/09_BENCHMARKS_AND_EVALUATIONS.md) | Latency budgets (P50/P95), Web Audio benchmarks, barge-in performance, and hiring evaluation calibration. |

---

## 🧪 Running Automated Tests & Typechecks

```bash
# Typecheck backend
cd apps/backend && bunx tsc --noEmit

# Typecheck & build frontend
cd apps/frontend && bunx tsc --noEmit && bun run build
```

---

## 📄 Resume Project Description

```text
AI Technical Interviewer (Voice AI) | React 19, TypeScript, Bun, Express 5, PostgreSQL, Prisma, Web Audio API, Gemini Live API, WebSockets
• Engineered a real-time voice technical screening platform with Gemini Live API (gemini-3.1-flash-live-preview) over WebSockets, achieving sub-350ms P95 turnaround latency without intermediate STT/TTS serialization.
• Architected a Web Audio API streaming pipeline with 16kHz mono PCM capture, gapless 24kHz buffer scheduling, dual-track C++ graph session recording (.webm/.m4a) with EBML duration patching, and client-side barge-in buffer drainage.
• Implemented a stateful conversational engine with structured 2-sentence turn cadence, adaptive depth-to-breadth probing, ASR phonetic normalization ("post grass" -> PostgreSQL), and thinking-pause detection.
• Built a GitHub ingestion service with URL auto-detection, 10-minute TTL LRU caching, and sandboxed README context extraction across 8 specialized domain tracks.
• Developed an automated evaluation service enforcing technical accuracy thresholds, evidence-grounded scoring from verbatim quotes, candidate Q&A isolation, and structured JSON rubric generation.
• Designed a 2-tier access model supporting hosted demo IP sliding-window rate limits and zero-persistence Bring-Your-Own-Key (BYOK) authentication with pre-flight validation.
```

---

## 📜 License

MIT License © 2026 Chirag Panjabi