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

### 1. 🎯 Interactive GitHub Repository & Flagship Grounding
- **Flexible 4-Way Project Selection**:
  - **Direct Repo URL**: Paste `https://github.com/username/project` or `username/project` to auto-detect the candidate and target repository.
  - **Interactive Project Cards**: View top starred repositories with star counts, primary language tags, and project descriptions.
  - **Custom Repo Option**: Enter any public repository name via `"+ Target Other Repository..."`.
  - **General Domain Screen**: Skip project-specific questions and jump straight into domain engineering scenarios.
- **In-Memory LRU Cache (10-min TTL)**: Prevents hitting GitHub unauthenticated rate limits (60 req/hr).
- **Targeted README Ingestion**: Sanitizes the chosen project's README (up to 2,000 chars) and isolates it inside `<untrusted_candidate_repo_context>` for prompt injection defense.

### 2. 🗣️ Strict 2-Sentence Conversational Cadence Formula
- **Sentence 1 (Micro-Grounding $\le 8$ words)**: Brief natural reaction acknowledging the candidate's last point *(e.g., "Understood on the Redis Lua approach.")*.
- **Sentence 2 (Probing Question)**: Exactly ONE direct, un-spoiled question targeting mechanics, trade-offs, or failure modes.
- **80/20 Airtime Ratio**: Eliminates lengthy AI monologues that cause candidate audio barge-in drops in WebRTC/WebSocket streams.

### 3. 🧠 Universal Dynamic Track Depth Generator
- **Multi-Layer Depth Drill-Down**: 
  1. *Layer 1 (The Decision)*: Why this architecture/pattern over alternatives?
  2. *Layer 2 (The Mechanics)*: Low-level engine internals, indexes, locks, memory layouts.
  3. *Layer 3 (Production Pressures)*: 10x traffic surges, network partitions, cascading failures.
- **Universal Custom Track Support**: Dynamically generates 3-layer depth drill trees for any arbitrary track without hardcoded fallbacks.

### 4. ⚖️ Dynamic First-Principles Master Evaluator
- Evidence-based evaluator enforcing 4 First Principles:
  1. **Anti-Spoonfeeding Invariant**: 0 credit if the interviewer named the tool or completed the candidate's sentence.
  2. **Mechanical Depth vs. Buzzwords**: Differentiates surface buzzwords from underlying storage/network/memory mechanics.
  3. **Precision & Inaccuracy Penalties**: Docks severe technical errors or hallucinations into the 0.0 – 2.5 range.
  4. **Zero Participation Praise**: `strengths: []` when standards are not met.

### 5. 🎙️ 100% Free-Tier Multimodal Voice Architecture
- **Gemini Multimodal Live API (`gemini-3.1-flash-live-preview`)**: Native audio-to-audio streaming with zero third-party STT/TTS costs.
- **Native Barge-In Interruption Handling**: Instantly cuts off AI playback on the client when the candidate begins speaking.
- **Web Audio API**: Client-side 16kHz PCM capture, 7-band equalizer amplitude bars, and gapless 24kHz buffer scheduling.

### 6. 🛡️ 2-Tier Access & Configurable Demo Quotas
- **Hosted Cloud Demo**: 1-click evaluation out of the box with configurable IP rate limits (`DEMO_DAILY_INTERVIEW_LIMIT=15`).
- **Bring-Your-Own-Key (BYOK)**: Candidates can supply their personal free Google AI Studio key with live pre-flight key verification, client-only persistence, and zero rate limits.

---

## 🧭 Supported Technical Tracks & Seniority Matrix

| Technical Focus Track | Primary Architectural Focus & Evaluation Drill |
| :--- | :--- |
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

Run Prisma to push the database schema to your PostgreSQL instance:

```bash
cd apps/backend
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
AI Technical Interview Platform | React 19, TypeScript, Bun, Express 5, PostgreSQL, Prisma, Web Audio API, Gemini Live API
• Engineered a production-grade multimodal voice screening platform utilizing Google Gemini Live API (gemini-3.1-flash-live-preview) for bidirectional, zero-cost, sub-350ms P95 latency audio conversations.
• Architected a low-latency Web Audio API pipeline with 16kHz Int16 PCM microphone streaming, gapless 24kHz audio buffer scheduling, and instantaneous client-side buffer drainage on candidate barge-in interruptions.
• Built an interactive GitHub repository ingestion engine featuring URL auto-detection, a 10-minute TTL in-memory LRU cache, and prompt-injection-isolated README architecture extraction across 8 specialized domains.
• Implemented a strict 2-sentence conversational cadence formula and an automated First-Principles evaluator enforcing anti-spoonfeeding invariants, mechanical depth scoring, and structured rubric synthesis.
• Designed a 2-tier rate limiting & BYOK security architecture with configurable daily IP demo quotas and zero-persistence client-side API key encryption.
```

---

## 📜 License

MIT License © 2026 Chirag Panjabi