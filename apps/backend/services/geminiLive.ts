import { WebSocket as WsClient } from "ws";
import { prisma } from "../db";
import { config } from "../config";

interface ClientMessage {
  type: "audio" | "end" | "ping";
  pcm?: string; // Base64-encoded 16kHz mono 16-bit PCM
}

interface ActiveSession {
  interviewId: string;
  clientWs: any;
  geminiWs: WsClient | null;
  isSessionActive: boolean;
  currentAssistantTranscript: string;
  currentUserTranscript: string;
  audioChunkCount: number;
  graceTimeout: ReturnType<typeof setTimeout> | null;
  modelName: string;
  cleanup: () => Promise<void>;
  attachClient: (newClientWs: any) => void;
}

const activeSessions = new Map<string, ActiveSession>();

export function handleGeminiLiveSession(clientWs: any, interviewId: string) {
  // Check if an existing session is still in grace period for this interviewId
  const existingSession = activeSessions.get(interviewId);
  if (existingSession && existingSession.isSessionActive && existingSession.geminiWs?.readyState === WsClient.OPEN) {
    console.log(`[GeminiLive] Resuming active session for reconnected candidate: ${interviewId}`);
    existingSession.attachClient(clientWs);
    return;
  }

  let geminiWs: WsClient | null = null;
  let isSessionActive = true;
  let isExplicitEnd = false;
  let currentAssistantTranscript = "";
  let currentUserTranscript = "";
  let audioChunkCount = 0;
  let activeClientWs = clientWs;
  let graceTimeout: ReturnType<typeof setTimeout> | null = null;
  const modelName = config.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview";

  const sessionObj: ActiveSession = {
    interviewId,
    clientWs: activeClientWs,
    geminiWs,
    isSessionActive,
    currentAssistantTranscript,
    currentUserTranscript,
    audioChunkCount,
    graceTimeout,
    modelName,
    cleanup,
    attachClient,
  };

  activeSessions.set(interviewId, sessionObj);

  function attachClient(newClientWs: any) {
    if (sessionObj.graceTimeout) {
      clearTimeout(sessionObj.graceTimeout);
      sessionObj.graceTimeout = null;
      console.log(`[GeminiLive] Reconnect grace timer cancelled for ${interviewId}`);
    }

    activeClientWs = newClientWs;
    sessionObj.clientWs = newClientWs;
    bindClientWs(newClientWs);

    // Notify frontend of successful reconnection
    try {
      newClientWs.send(JSON.stringify({ type: "reconnected", model: modelName }));
    } catch (e) {
      console.error("[GeminiLive] Error sending reconnected event:", e);
    }
  }

  async function init() {
    try {
      const interview = await prisma.interview.findUnique({
        where: { id: interviewId },
      });

      if (!interview) {
        activeClientWs.send(JSON.stringify({ type: "error", message: "Interview not found" }));
        activeClientWs.close();
        activeSessions.delete(interviewId);
        return;
      }

      // Mark interview as IN_PROGRESS
      await prisma.interview.update({
        where: { id: interviewId },
        data: { status: "IN_PROGRESS" },
      });

      // Parse and format candidate GitHub background cleanly
      let hasValidRepos = false;
      let candidateProfileSummary = "No public GitHub repositories or profile details provided.";
      let candidateDisplayName = "Candidate";

      if (interview.githubMetadata) {
        try {
          const meta = typeof interview.githubMetadata === "string" 
            ? JSON.parse(interview.githubMetadata) 
            : interview.githubMetadata;

          // Clean display name so speech synthesis doesn't say "dash" or "underscore"
          const rawName = meta.name || meta.username || "Candidate";
          candidateDisplayName = rawName.split(/[-_]/)[0] || rawName;

          if (Array.isArray(meta.repos) && meta.repos.length > 0) {
            hasValidRepos = true;
            const reposList = meta.repos
              .slice(0, 8)
              .map((r: any) => {
                let text = `- ${r.name} (${r.language || "General"}): ${r.description || "No description"} [Topics: ${(r.topics || []).join(", ") || "none"}]`;
                if (r.readme) {
                  text += `\n  README Summary: ${r.readme.slice(0, 400).replace(/\n+/g, " ")}...`;
                }
                return text;
              })
              .join("\n");

            candidateProfileSummary = `Candidate Username: ${meta.username || "Candidate"}
Candidate Spoken Name: ${candidateDisplayName}
Bio: ${meta.bio || "None provided"}
Public Repositories:
${reposList}`;
          }
        } catch {
          candidateProfileSummary = String(interview.githubMetadata);
        }
      }

      const systemPrompt = `You are Alex, a Principal Software Engineer at a top technology company (like Stripe, Google, or Meta), conducting an authentic, rigorous, live 1-on-1 technical screening interview.

### CANDIDATE CONTEXT:
Candidate Name: ${candidateDisplayName}
${candidateProfileSummary}
${hasValidRepos ? "The candidate has public repositories listed above." : "NOTE: The candidate has no public repositories available. Follow the EMPTY/PRIVATE PROFILE FALLBACK protocol below."}

### CORE INTERVIEW STANDARDS & BEHAVIOR:
1. **Concise Spoken Turns (1 to 3 sentences maximum)**:
   - Real interviewers never lecture or deliver long speeches. You speak concisely and leave 80% of the airtime to the candidate.
2. **Ask Exactly ONE Question at a Time**:
   - Never ask compound, multi-part, or vague questions. Ask one laser-focused question and pause for the candidate's response.
3. **Active Technical Probing (Zero Fluff / Zero Sycophancy)**:
   - Do NOT give empty, repetitive praise (avoid "Awesome!", "That's fantastic!", "Great job!").
   - Instead, briefly acknowledge the technical core of what they said ("Understood, so you opted for WebSocket connections to minimize polling overhead...") and immediately probe the deeper mechanism ("...how did you handle connection state recovery and message replay if a client disconnects mid-stream?").
4. **Active Fact-Checking & Technical Inaccuracy Detection**:
   - If the candidate makes an incorrect technical claim, flawed assumption, or misidentifies time/space complexity, do NOT nod along. Gently challenge them: "Are you certain about that complexity? What happens when the input is unsorted?"
5. **Anti-Hijacking & Role-Lock (Tutor Trap Defense)**:
   - If the candidate asks you to explain a concept, write code, or give the answer, do not become a tutor. Politely redirect: "I'd love to hear your thoughts and engineering approach first before we discuss the solution."
6. **Graceful Pivots on Knowledge Gaps**:
   - If the candidate admits they don't know a concept or struggles with a specific topic, acknowledge cleanly without being awkward: "Fair enough, let's look at another aspect of your stack," and pivot immediately.
7. **Candidate Exit & Wrap-Up Detection**:
   - If the candidate indicates they want to wrap up, end early, or ask for feedback (e.g., "I'm ready to wrap up", "I have to go", "Let's conclude"), deliver a warm, professional 1-sentence closing: "Thank you for your time today! You can now click the End Interview button below to generate and review your detailed technical evaluation scorecard."
8. **Pure Natural Audio Formatting & Language Lock**:
   - Speak strictly in clear, professional English. Never speak markdown syntax (no asterisks, no bullet points, no backticks, no code snippets). Speak in natural, fluid conversational English.

### STRUCTURED 4-PHASE INTERVIEW PROGRESSION:
- **Phase 1: Grounding & Architecture (Turns 1-2)**:
  ${hasValidRepos 
    ? `Greet ${candidateDisplayName} briefly (1 sentence), cite ONE specific project from their GitHub, and ask a targeted question about its architecture and design goals.` 
    : `Greet ${candidateDisplayName} briefly (1 sentence), ask what language/domain they specialize in (backend, distributed systems, fullstack), and propose a realistic system scenario to explore.`}
- **Phase 2: Deep Component Flow & Data Decisions (Turns 3-4)**:
  - Probe data flow, API/network contracts, database choices, state management, and caching strategies.
- **Phase 3: Real-World Scaling & Edge Cases (Turns 5-6)**:
  - Challenge with 10x traffic, race conditions, network failures, cache invalidation, or database deadlocks.
- **Phase 4: Fundamental CS & Algorithmic Trade-offs (Turns 7+)**:
  - Probe core computer science principles: time/space complexity, locking strategies, indexing internals, or concurrency primitives.`;

      const host = "generativelanguage.googleapis.com";
      const uri = `wss://${host}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${config.GEMINI_API_KEY}`;

      console.log(`[GeminiLive] Opening WebSocket to Gemini Live (${modelName}) for interview: ${interviewId}`);
      geminiWs = new WsClient(uri);
      sessionObj.geminiWs = geminiWs;

      geminiWs.on("open", () => {
        console.log(`[GeminiLive] Connected to Gemini Live API. Sending BidiGenerateContentSetup payload...`);

        const setupMessage = {
          setup: {
            model: `models/${modelName}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede",
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        };

        geminiWs?.send(JSON.stringify(setupMessage));
      });

      geminiWs.on("message", async (data: any) => {
        if (!isSessionActive) return;

        try {
          const msgStr = data.toString();
          const response = JSON.parse(msgStr);

          // 1. Setup completed event
          if (response.setupComplete) {
            console.log(`[GeminiLive] Handshake verified (setupComplete) for ${interviewId}. Starting session...`);
            
            activeClientWs.send(JSON.stringify({ type: "ready", model: modelName }));

            const openingTurnText = hasValidRepos
              ? `Hello Alex! I am ready for the technical screen. Please introduce yourself and ask your first question based on my featured GitHub project.`
              : `Hello Alex! I am ready for the technical screen. Please introduce yourself and ask your first question.`;

            geminiWs?.send(
              JSON.stringify({
                clientContent: {
                  turns: [
                    {
                      role: "user",
                      parts: [
                        {
                          text: openingTurnText,
                        },
                      ],
                    },
                  ],
                  turnComplete: true,
                },
              })
            );
          }

          // 2. Handle server content
          const serverContent = response.serverContent;
          if (serverContent) {
            // A. Audio output parts
            if (serverContent.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                if (part.inlineData && part.inlineData.data) {
                  try {
                    activeClientWs.send(
                      JSON.stringify({
                        type: "audio",
                        pcm: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                      })
                    );
                  } catch (e) {
                    // Client temporarily disconnected while speech was incoming
                  }
                }
                if (part.text) {
                  currentAssistantTranscript += part.text;
                  try {
                    activeClientWs.send(
                      JSON.stringify({
                        type: "transcript",
                        role: "assistant",
                        text: part.text,
                      })
                    );
                  } catch (e) {}
                }
              }
            }

            // B. Streaming model output transcription
            if (serverContent.outputTranscription?.text) {
              const text = serverContent.outputTranscription.text;
              currentAssistantTranscript += text;
              try {
                activeClientWs.send(
                  JSON.stringify({
                    type: "transcript",
                    role: "assistant",
                    text,
                  })
                );
              } catch (e) {}

              if (currentUserTranscript.trim()) {
                const userText = currentUserTranscript.trim();
                currentUserTranscript = "";
                console.log(`[GeminiLive] User spoke: "${userText}"`);
                await prisma.message.create({
                  data: {
                    interviewId,
                    type: "User",
                    message: userText,
                  },
                });
              }
            }

            // C. Streaming user input transcription
            if (serverContent.inputTranscription?.text) {
              const text = serverContent.inputTranscription.text;
              currentUserTranscript += text;
              try {
                activeClientWs.send(
                  JSON.stringify({
                    type: "transcript",
                    role: "user",
                    text,
                  })
                );
              } catch (e) {}
            }

            // D. Barge-in / Interruption
            if (serverContent.interrupted) {
              console.log(`[GeminiLive] Interruption detected for interview: ${interviewId}`);
              try {
                activeClientWs.send(JSON.stringify({ type: "interrupt" }));
              } catch (e) {}
            }

            // E. Model Turn Complete
            if (serverContent.turnComplete) {
              try {
                activeClientWs.send(JSON.stringify({ type: "turnComplete" }));
              } catch (e) {}
              if (currentAssistantTranscript.trim()) {
                const assistantText = currentAssistantTranscript.trim();
                currentAssistantTranscript = "";
                console.log(`[GeminiLive] Alex turn completed: "${assistantText}"`);
                await prisma.message.create({
                  data: {
                    interviewId,
                    type: "Assistant",
                    message: assistantText,
                  },
                });
              }
            }
          }
        } catch (err) {
          console.error("[GeminiLive] Error handling message:", err);
        }
      });

      geminiWs.on("error", (err) => {
        console.error(`[GeminiLive] Gemini WS Error (${interviewId}):`, err.message);
        try {
          activeClientWs.send(JSON.stringify({ type: "error", message: "Live audio session error" }));
        } catch (e) {}
      });

      geminiWs.on("close", (code, reason) => {
        console.log(`[GeminiLive] Gemini WS Closed (${interviewId}): ${code} - ${reason.toString()}`);
        cleanup();
      });
    } catch (err: any) {
      console.error("[GeminiLive] Init error:", err);
      try {
        activeClientWs.send(JSON.stringify({ type: "error", message: err.message }));
      } catch (e) {}
      cleanup();
    }
  }

  async function cleanup() {
    if (!isSessionActive) return;
    isSessionActive = false;
    activeSessions.delete(interviewId);

    if (sessionObj.graceTimeout) {
      clearTimeout(sessionObj.graceTimeout);
      sessionObj.graceTimeout = null;
    }

    // Flush any remaining transcripts to database
    if (currentUserTranscript.trim()) {
      try {
        await prisma.message.create({
          data: {
            interviewId,
            type: "User",
            message: currentUserTranscript.trim(),
          },
        });
      } catch (e) {
        console.error("Error saving remaining user transcript:", e);
      }
    }

    if (currentAssistantTranscript.trim()) {
      try {
        await prisma.message.create({
          data: {
            interviewId,
            type: "Assistant",
            message: currentAssistantTranscript.trim(),
          },
        });
      } catch (e) {
        console.error("Error saving remaining assistant transcript:", e);
      }
    }

    if (geminiWs && geminiWs.readyState === WsClient.OPEN) {
      geminiWs.close();
    }
  }

  function bindClientWs(ws: any) {
    ws.on("message", (rawMsg: any) => {
      if (!isSessionActive) return;

      try {
        const msg: ClientMessage = JSON.parse(rawMsg.toString());

        if (msg.type === "audio" && msg.pcm && geminiWs && geminiWs.readyState === WsClient.OPEN) {
          audioChunkCount++;
          if (audioChunkCount % 50 === 1) {
            console.log(`[GeminiLive] Streaming mic audio chunk #${audioChunkCount} (${interviewId})`);
          }

          const realtimeInput = {
            realtimeInput: {
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data: msg.pcm,
              },
            },
          };
          geminiWs.send(JSON.stringify(realtimeInput));
        } else if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        } else if (msg.type === "end") {
          isExplicitEnd = true;
          cleanup();
          ws.close();
        }
      } catch (err) {
        console.error("[GeminiLive] Error processing client message:", err);
      }
    });

    ws.on("close", () => {
      if (isExplicitEnd || !isSessionActive) {
        console.log(`[GeminiLive] Client session cleanly terminated for ${interviewId}`);
        cleanup();
      } else {
        console.log(`[GeminiLive] Client disconnected unexpectedly (${interviewId}). Preserving session for 30s grace period...`);
        if (sessionObj.graceTimeout) clearTimeout(sessionObj.graceTimeout);
        sessionObj.graceTimeout = setTimeout(() => {
          console.log(`[GeminiLive] Grace period expired for ${interviewId}. Cleaning up session.`);
          cleanup();
        }, 30000);
      }
    });

    ws.on("error", (err: any) => {
      console.error(`[GeminiLive] Client WS error (${interviewId})`, err);
    });
  }

  bindClientWs(activeClientWs);
  init();
}
