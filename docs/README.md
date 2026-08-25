# AI Technical Interviewer — Internal Documentation Suite

Welcome to the internal engineering documentation for the **AI Technical Interviewer** platform. This repository powers real-time, low-latency, voice-driven technical interview screens calibrated to candidate seniority, tech stack, and GitHub portfolio context with instant Tier-1 evaluation dossiers.

---

## 📚 Table of Contents

| Document | Topic & Focus Area |
| :--- | :--- |
| [**01. System Architecture**](./01_SYSTEM_ARCHITECTURE.md) | High-level topology, monorepo layout, end-to-end data flows, and design principles. |
| [**02. Frontend Deep Dive**](./02_FRONTEND_DEEP_DIVE.md) | React components (`Form`, `Interview`, `Result`), Web Audio API pipeline, PCM streaming & playback. |
| [**03. Backend Deep Dive**](./03_BACKEND_DEEP_DIVE.md) | Express HTTP routes, WebSocket gateway, Gemini Live integration, and GitHub ingestion engine. |
| [**04. AI Prompting & Evaluation**](./04_AI_PROMPTING_AND_EVAL.md) | Staff Engineer Alex persona, 2-sentence conversational cadence, 3-layer depth drill, and Tier-1 rubrics. |
| [**05. Database & State Flow**](./05_DATABASE_AND_STATE_FLOW.md) | PostgreSQL schema, Prisma models, interview lifecycle state machine, and asynchronous turn persistence. |
| [**06. Deployment & BYOK Architecture**](./06_DEPLOYMENT_AND_BYOK.md) | Environment configuration, Vercel/Render hosting topologies, and Bring-Your-Own-Key security. |
| [**07. Troubleshooting & Runbook**](./07_TROUBLESHOOTING_RUNBOOK.md) | Diagnostic runbooks for common failures, local test scripts, and operational recovery commands. |
| [**08. API & WebSocket Reference**](./08_API_REFERENCE.md) | Complete reference for REST endpoints, schemas, real-time WebSocket protocol frames, and SDK integration examples. |
| [**09. Benchmarks & Evaluation Metrics**](./09_BENCHMARKS_AND_EVALUATIONS.md) | Latency budgets (P50/P95), Web Audio benchmarks, barge-in performance, and hiring evaluation calibration. |
| [**10. Architecture & Data Flow Diagrams**](./10_ARCHITECTURE_AND_DATA_FLOW_DIAGRAMS.md) | Master reference with 40 architectural diagrams, step-by-step traces, DSP math, and interview defense cheat sheet. |
| [**11. Interview Questions & Staff Defense**](./11_INTERVIEW_QUESTIONS_AND_STAFF_DEFENSE_COMPENDIUM.md) | Complete question bank (Fresher to Staff) covering React, Web Audio DSP, WebSockets, Prisma, AI Rubrics, and 100k-concurrency System Design. |

---

## ⚡ Quick Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["🖥️ Frontend Client (React 19 + Web Audio DSP)"]
        UI["Setup & Track Studio<br/>(8 Tracks + Seniority Matrix + BYOK Modal)"]
        VoiceStage["Voice Stage & VoiceOrbs<br/>(60 FPS RMS Energy Visualizer)"]
        
        subgraph ClientAudioEngine ["Native C++ Web Audio DSP Pipeline"]
            MicNode["Mic Input (48k -> 16k Linear Resampling)"]
            PlayerNode["Live Audio Player (24kHz Jitter-Free Scheduler)"]
            DSPMixer["MediaStreamAudioDestinationNode<br/>(Dual-Track Zero-Latency Mixer)"]
            EBMLPatcher["EBML Header Duration Patcher<br/>(crbug/642012 In-Place Fix)"]
        end

        IDB[("IndexedDB Local Store<br/>(5-Session LRU / <50MB Cap)")]
        ScorecardUI["Executive Scorecard Dossier<br/>(4-Pillar Rubric + Interactive Transcript)"]
    end

    subgraph Gateway ["⚡ Backend Server (Bun + Express 5 + WebSockets)"]
        RESTRouter["Express 5 REST API (:3001)<br/>(GitHub Scraper + Rate Limiter)"]
        WSHub["WebSocket Gateway Hub (:3001/api/v1/live/:id)<br/>(Bidi Proxy + Turn Cadence Controller)"]
        DBQueue["Async Serial Write Queue<br/>(Zero-Lag Event Loop Microtasks)"]
    end

    subgraph DataTier ["🗄️ Persistence Tier"]
        PostgresDB[("Neon Serverless PostgreSQL<br/>(Prisma ORM + pg.Pool)")]
    end

    subgraph CloudAI ["☁️ Google Gemini Cloud"]
        GeminiLive["Gemini 3.1 Flash Live API (WSS)<br/>Native Bidirectional Audio-to-Audio"]
        GeminiFlash["Gemini Flash Latest (REST)<br/>Structured JSON Rubric Synthesis"]
    end

    %% Edge Connections - Realtime Stream
    MicNode -->|"16kHz Mono PCM (Base64)"| WSHub
    WSHub <-->|"Bidi Live PCM Stream"| GeminiLive
    GeminiLive -->|"24kHz Audio Buffers"| WSHub
    WSHub -->|"24kHz PCM Chunks"| PlayerNode
    PlayerNode --> VoiceStage

    %% Edge Connections - Local DSP & Recording
    MicNode --> DSPMixer
    PlayerNode --> DSPMixer
    DSPMixer -->|"WebM / M4A 2s Timeslice"| EBMLPatcher
    EBMLPatcher -->|"Patched Seekable Audio"| IDB
    IDB -.->|"Local Zero-Cost Playback"| ScorecardUI

    %% Edge Connections - Setup & Evaluation
    UI -->|"POST /pre-interview"| RESTRouter
    RESTRouter --> DBQueue
    WSHub --> DBQueue
    DBQueue -->|"Non-Blocking Batch Inserts"| PostgresDB
    ScorecardUI -->|"GET /result/:id"| RESTRouter
    RESTRouter -->|"Grade Transcript"| GeminiFlash
    GeminiFlash -->|"Structured Dossier JSON"| PostgresDB
```
