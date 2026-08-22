# 🎙️ AI Technical Interviewer (100% Free-Tier Multimodal Voice AI)

A production-grade, real-time voice technical screening platform powered by Google's **Gemini Multimodal Live API** (`gemini-3.1-flash-live-preview`) and structured candidate evaluation with **`gemini-flash-latest`**.

Built with a modern full-stack architecture (**React 19**, **Bun**, **Express 5**, **PostgreSQL**, **Prisma**, **Web Audio API**), providing zero-cost, ultra-low-latency, bidirectional audio conversations with native barge-in interruptions.

---

## 🏛️ Architecture Overview

```mermaid
flowchart TD
    subgraph Client["Frontend (React 19 + Web Audio API)"]
        Form["Interactive Setup & Project Selector<br/>(Repo Cards, Direct URL, Custom Repo)"]
        Mic["Microphone Input<br/>(16kHz Mono Int16 PCM)"]
        Player["Live Audio Player<br/>(24kHz PCM Scheduling + Barge-in)"]
        Controls["In-Call Controls<br/>(Mute Toggle, Live Timer, Pre-Join Mic Check)"]
        Orb["VoiceOrb Visualizer<br/>(RMS Volume Reactive)"]
    end

    subgraph Server["Backend Server (Bun + Express 5 + WS)"]
        PreviewAPI["Preview API (/api/v1/github-preview)<br/>(10-min LRU Cache + Non-blocking)"]
        WSServer["WebSocket Server<br/>/api/v1/live/:interviewId"]
        PromptEngine["Prompt Engine (promptBuilder.ts)<br/>2-Sentence Cadence & 4-Layer Depth Drill"]
        EvalService["Evaluation Engine (evaluation.ts)<br/>Dynamic First-Principles Evaluator"]
        DB[(PostgreSQL + Prisma)]
    end

    subgraph GoogleAI["Google Gemini Cloud"]
        LiveAPI["Gemini Multimodal Live API<br/>(gemini-3.1-flash-live-preview)<br/>Bi-directional Audio + Native STT"]
        EvalModel["Gemini Flash Latest<br/>First-Principles Rubric Analysis"]
    end

    Form -->|Preview Fetch| PreviewAPI
    Form -->|Start Interview (Target Repo)| WSServer
    Mic -->|Base64 PCM Chunks| WSServer
    WSServer -->|System Prompt + Audio Stream| LiveAPI
    LiveAPI -->|24kHz Audio Chunks + Transcripts| WSServer
    WSServer -->|Stream Audio + Captions| Player
    Player --> Orb
    Mic --> Orb

    LiveAPI -->|Transcripts & Messages| DB
    WSServer -->|Trigger Evaluation| EvalModel
    EvalModel -->|Structured JSON Scorecard| DB
```

---

## ✨ Key Engineering Highlights

### 1. 🎯 Interactive GitHub Repository & Flagship Project Selector
- **Flexible 3-Way Project Selection**:
  - **Direct Repo URL**: Paste `https://github.com/username/project` or `username/project` to auto-detect the candidate and target repository.
  - **Interactive Project Cards**: View top starred repositories with star counts, primary language tags, and project descriptions.
  - **Custom Repo Option**: Enter any public repository name via `"➕ Other Public Repo..."`.
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
- **Universal Custom Track Support**: Generates 4-layer depth drill trees for any arbitrary track (`DATA_ENGINEERING`, `CYBER_SECURITY`, `MOBILE_IOS`, `EMBEDDED_SYSTEMS`, etc.) without hardcoded fallbacks.

### 4. ⚖️ Dynamic First-Principles Master Evaluator
- Replaced 800+ lines of brittle rubric dictionaries with a single unified, evidence-based evaluator enforcing 4 First Principles:
  1. **Anti-Spoonfeeding Invariant**: 0 credit if the interviewer named the tool or completed the candidate's sentence.
  2. **Mechanical Depth vs. Buzzwords**: Differentiates surface buzzwords from underlying storage/network/memory mechanics.
  3. **Precision & Inaccuracy Penalties**: Docks severe technical errors or hallucinations into the 0.0 – 2.5 range.
  4. **Zero Participation Praise**: `strengths: []` when standards are not met.

### 5. 🎙️ 100% Free-Tier Multimodal Voice Architecture
- **Gemini Multimodal Live API (`gemini-3.1-flash-live-preview`)**: Native audio-to-audio streaming with zero third-party STT/TTS costs.
- **Native Barge-In Interruption Handling**: Instantly cuts off AI playback on the client when the candidate begins speaking.
- **Web Audio API**: Client-side 16kHz PCM capture and gapless 24kHz buffer scheduling.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Radix UI, Lucide Icons, React Router v7 |
| **Audio Engine** | Web Audio API, `ScriptProcessorNode` / `AudioContext`, Int16/Float32 PCM pipeline |
| **Backend** | Bun runtime, Express 5, `ws` WebSocket Server, Zod validation |
| **Database & ORM** | PostgreSQL, Prisma ORM with typed relations and cascade constraints |
| **AI Models** | `gemini-3.1-flash-live-preview` (Voice Live API) & `gemini-flash-latest` (Structured Evaluation) |
| **Package Management** | Turborepo, Bun workspaces |

---

## 🚀 Step-by-Step Local Setup Guide

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

You can run both backend and frontend concurrently from the root directory:

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
AI Technical Interview Platform | React 19, Bun, Express 5, PostgreSQL, Prisma, Gemini Multimodal Live API
• Engineered a real-time voice interview platform leveraging Gemini Live API (gemini-3.1-flash-live-preview) for zero-cost, sub-second latency audio-to-audio conversations.
• Designed Web Audio API client pipeline handling 16kHz PCM mic capture, gapless 24kHz audio playback, mic mute controls, and instant barge-in interruption draining.
• Implemented an interactive GitHub repository selector with direct repo URL parsing, preview caching, and targeted README architecture grounding.
• Architected a 2-sentence voice cadence formula and a dynamic First-Principles evaluation engine across 8 technical tracks and 3 seniority levels.
```

---

## 📜 License

MIT