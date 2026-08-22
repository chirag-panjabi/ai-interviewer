# 🎙️ AI Technical Interviewer (100% Free-Tier Multimodal Voice AI)

A production-grade, real-time voice technical screening platform powered by Google's **Gemini Multimodal Live API** (`gemini-3.1-flash-live-preview`) and structured candidate evaluation with **`gemini-flash-latest`**.

Built with a modern full-stack architecture (**React 19**, **Bun**, **Express**, **PostgreSQL**, **Prisma**, **Web Audio API**), providing zero-cost, ultra-low-latency, bidirectional audio conversations with native barge-in interruptions.

---

## 🏛️ Architecture Overview

```mermaid
flowchart TD
    subgraph Client["Frontend (React 19 + Web Audio API)"]
        Mic["Microphone Input<br/>(16kHz Mono Int16 PCM)"]
        Player["Live Audio Player<br/>(24kHz PCM Scheduling + Barge-in)"]
        Controls["In-Call Controls<br/>(Mute Toggle, Live Timer, Pre-Join Mic Check)"]
        Orb["VoiceOrb Visualizer<br/>(RMS Volume Reactive)"]
    end

    subgraph Server["Backend Server (Bun + Express 5 + WS)"]
        WSServer["WebSocket Server<br/>/api/v1/live/:interviewId"]
        GHService["GitHub Context Service<br/>(Repos + README Extraction)"]
        EvalService["Evaluation Engine<br/>(Gemini Flash Standardized Rubric)"]
        DB[(PostgreSQL + Prisma)]
    end

    subgraph GoogleAI["Google Gemini Cloud"]
        LiveAPI["Gemini Multimodal Live API<br/>(gemini-3.1-flash-live-preview)<br/>Bi-directional Audio + Native STT"]
        EvalModel["Gemini Flash Latest<br/>Deep Structured Rubric Analysis"]
    end

    Mic -->|Base64 PCM Chunks| WSServer
    WSServer -->|Relay Audio| LiveAPI
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

- **100% Free-Tier Multimodal Audio Architecture**: Replaced expensive paid third-party STT/TTS services (Deepgram, OpenAI Realtime) with the Gemini Multimodal Live API (`gemini-3.1-flash-live-preview`), enabling free bidirectional audio-to-audio streaming.
- **Native Barge-In Interruption Handling**: Low-latency interruption detection cuts off AI audio playback instantly on the client side when the candidate begins speaking.
- **Real-Time Web Audio PCM Processing**: Client-side downsampling to 16kHz PCM using Web Audio API and gapless 24kHz buffer scheduling for smooth, glitch-free spoken output.
- **In-Call Microphone Mute & Live Timer**: Instant mute toggle that gates WebSocket PCM transmission without hardware re-acquisition latency, with live elapsed call timing (`MM:SS`).
- **Pre-Join Microphone Level Verification**: Interactive lobby mic test with live RMS volume meter and zero-duplicate-permission `MediaStream` reuse.
- **Dynamic Repository & README Ingestion**: Enriches candidate profile using the GitHub REST API, automatically extracting top project architecture `README.md` summaries for deep technical questioning.
- **Rigorous 4-Pillar Evaluation Rubric**: Evaluates candidates across *Technical Accuracy*, *Problem Solving*, *Communication*, and *Engineering Depth* with verifiable transcript quotes and calibrated recommendations (`Strong Hire`, `Hire`, `Lean Hire`, `No Hire`).
- **Scorecard PDF Export & 1-Click Sharing**: Built-in print stylesheet for clean PDF export and shareable URLs.
- **Interactive Transcript Search & Filtering**: Real-time keyword search and speaker role filters (`All` / `Alex` / `You`) on the post-interview scorecard.
- **Race-Condition Safe Pipeline**: State-machine transition (`CREATED` → `IN_PROGRESS` → `EVALUATING` → `COMPLETED`) prevents concurrent duplicate LLM evaluations.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Radix UI, Lucide Icons, React Router v7 |
| **Audio Engine** | Web Audio API, `ScriptProcessorNode` / `AudioContext`, Int16/Float32 PCM pipeline |
| **Backend** | Bun runtime, Express 5, `ws` WebSocket Server, Zod schema validation |
| **Database & ORM** | PostgreSQL, Prisma with cascade constraints and typed models |
| **AI Models** | `gemini-3.1-flash-live-preview` (Voice Live API) & `gemini-flash-latest` (Structured Evaluation) |
| **Package Management** | Turborepo, Bun workspaces |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.2+)
- PostgreSQL database instance (local or hosted like [Neon](https://neon.tech) / [Supabase](https://supabase.com))
- Free Gemini API Key from [Google AI Studio](https://aistudio.google.com)

### 1. Clone & Install

```bash
git clone https://github.com/chirag-panjabi/ai-interviewer.git
cd ai-interviewer
bun install
```

### 2. Configure Environment Variables

Create `.env` in `apps/backend/.env` (or root `.env`):

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_interviewer"
GEMINI_API_KEY="your_gemini_api_key_from_google_ai_studio"

# Model Configuration
GEMINI_LIVE_MODEL="gemini-3.1-flash-live-preview"
GEMINI_EVAL_MODEL="gemini-flash-latest"

PORT=3001
CORS_ORIGIN="http://localhost:3000"
# GITHUB_TOKEN="ghp_xxxx" # Optional: increases GitHub API rate limits
```

### 3. Database Migration

```bash
cd apps/backend
bunx prisma db push
```

### 4. Start the Application

From the root directory:

```bash
# Run both backend and frontend concurrently
bun run dev
```

- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:3001`

---

## 📄 Resume Project Description

```text
AI Technical Interview Platform | React 19, Bun, Express, PostgreSQL, Prisma, Gemini Multimodal Live API
• Engineered a real-time voice interview platform leveraging Gemini Live API (gemini-3.1-flash-live-preview) for zero-cost, sub-second latency audio-to-audio conversations.
• Designed Web Audio API client pipeline handling 16kHz PCM mic capture, gapless 24kHz audio playback, mic mute controls, and instant barge-in interruption draining.
• Implemented automated GitHub portfolio & README ingestion to dynamically ground interview questions in candidate's real repositories and code architecture.
• Built structured candidate evaluation pipeline with Gemini Flash across 4 technical dimensions with transcript evidence, shareable scorecards, and PDF export.
```

---

## 📜 License

MIT