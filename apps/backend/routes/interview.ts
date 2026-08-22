import { Router } from "express";
import axios from "axios";
import { PreInterviewBody } from "../types";
import { scrapeGithub, getGithubReposPreview } from "../services/github";
import { prisma } from "../db";
import { calculateResult } from "../services/evaluation";
import { interviewCreationLimiter } from "../middleware/rateLimiter";

export const interviewRouter = Router();

// 1. Live Google Gemini API Key Verification (Fast ping check)
interviewRouter.post("/verify-key", async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    res.status(400).json({ valid: false, error: "API key cannot be empty." });
    return;
  }

  const cleanKey = apiKey.trim();
  if (cleanKey.length < 15) {
    res.status(400).json({ valid: false, error: "API key is too short. Expected a valid Google Gemini API key." });
    return;
  }

  if (cleanKey.startsWith("sk-") || cleanKey.startsWith("ghp_") || cleanKey.startsWith("gho_")) {
    res.status(400).json({ valid: false, error: "This looks like an OpenAI or GitHub token. Please provide a Google Gemini API key." });
    return;
  }

  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`,
      { timeout: 8000 }
    );

    if (response.status === 200) {
      res.json({ valid: true, modelsCount: response.data?.models?.length || 0 });
      return;
    }

    res.json({ valid: false, error: "Unexpected response from Google API." });
  } catch (err: any) {
    const status = err?.response?.status;
    const errData = err?.response?.data?.error;
    const msg = errData?.message || err?.message || "Google rejected this API key.";

    console.warn(`[KeyVerification] Key verification rejected by Google (HTTP ${status || "unknown"}): ${msg}`);

    if (status === 400 || status === 403) {
      res.json({
        valid: false,
        error: `Google rejected this key: ${errData?.message || "Invalid API key"}. Please check your key in Google AI Studio.`,
      });
      return;
    }

    if (status === 429) {
      res.json({
        valid: false,
        error: "Google API rate limit / quota exceeded for this key.",
      });
      return;
    }

    res.json({
      valid: false,
      error: `Could not verify key with Google (${msg}).`,
    });
  }
});

// 2. Preview candidate GitHub repositories (Cached, fast response)
interviewRouter.post("/github-preview", async (req, res) => {
  const { github } = req.body;
  if (!github || typeof github !== "string" || !github.trim()) {
    res.status(400).json({ message: "GitHub username or URL is required." });
    return;
  }

  try {
    const preview = await getGithubReposPreview(github.trim());
    res.json(preview);
  } catch (err: any) {
    console.error("Error fetching github preview:", err?.message);
    res.status(500).json({ message: "Could not fetch GitHub repositories preview." });
  }
});

// 2. Ingest GitHub profile and initialize interview (Rate limited to 15 / day / IP)
interviewRouter.post("/pre-interview", interviewCreationLimiter, async (req, res) => {
  const { success, data } = PreInterviewBody.safeParse(req.body);

  if (!success) {
    res.status(400).json({
      message: "Invalid request body. Expected { github: string }.",
    });
    return;
  }

  try {
    const githubData = await scrapeGithub(data.github, data.selectedRepo);

    const interview = await prisma.interview.create({
      data: {
        githubMetadata: JSON.stringify(githubData),
        experienceLevel: data.experienceLevel,
        track: data.track as any,
        status: "CREATED",
      },
    });

    res.json({ id: interview.id });
  } catch (err: any) {
    console.error("Error creating pre-interview:", err);
    res.status(500).json({ message: "Failed to initialize interview" });
  }
});

// 2. Add manual user message (fallback/testing)
interviewRouter.post("/session/user/response/:interviewId", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).json({ message: "Message is required" });
    return;
  }

  try {
    await prisma.message.create({
      data: {
        interviewId: req.params.interviewId as string,
        type: "User",
        message: String(message),
      },
    });

    res.json({ message: "Message saved" });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to save message" });
  }
});

// 3. Get / Trigger evaluation result
interviewRouter.get("/result/:interviewId", async (req, res) => {
  const interviewId = req.params.interviewId as string;

  try {
    const interview = await prisma.interview.findFirst({
      where: { id: interviewId },
      include: {
        conversations: {
          orderBy: [
            { turnIndex: "asc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    if (!interview) {
      res.status(404).json({ message: "Interview not found" });
      return;
    }

    const transcript = interview.conversations.map((c) => ({
      type: c.type,
      content: c.message,
      turnIndex: c.turnIndex,
      wasInterrupted: c.wasInterrupted,
      createdAt: c.createdAt,
    }));

    // If already evaluated, return immediately
    if (interview.status === "COMPLETED") {
      let parsedEvaluation = interview.evaluationData;
      if (typeof parsedEvaluation === "string") {
        try {
          parsedEvaluation = JSON.parse(parsedEvaluation);
        } catch {
          // ignore
        }
      }

      res.json({
        id: interview.id,
        score: interview.score,
        feedback: interview.feedback,
        evaluationData: parsedEvaluation,
        experienceLevel: interview.experienceLevel,
        track: interview.track,
        transcript,
        status: "COMPLETED",
      });
      return;
    }

    // If another request is currently evaluating, let polling client wait
    if (interview.status === "EVALUATING") {
      res.json({
        id: interview.id,
        status: "EVALUATING",
        message: "Evaluation is currently in progress...",
        experienceLevel: interview.experienceLevel,
        track: interview.track,
        transcript,
      });
      return;
    }

    // Atomically set status to EVALUATING to prevent duplicate parallel Gemini API calls
    await prisma.interview.update({
      where: { id: interviewId },
      data: { status: "EVALUATING" },
    });

    // Run evaluation with Gemini, tailored to level & track (using custom key if provided)
    const customApiKey = (req.headers["x-gemini-api-key"] || req.headers["x-api-key"]) as string | undefined;
    const result = await calculateResult(
      interview.conversations,
      interview.githubMetadata,
      interview.experienceLevel,
      interview.track,
      customApiKey
    );

    // Save final structured evaluation
    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: "COMPLETED",
        score: result.score,
        feedback: result.feedback,
        evaluationData: JSON.stringify(result.evaluationData),
      },
    });

    res.json({
      id: updated.id,
      score: updated.score,
      feedback: updated.feedback,
      evaluationData: result.evaluationData,
      experienceLevel: updated.experienceLevel,
      track: updated.track,
      transcript,
      status: "COMPLETED",
    });
  } catch (err: any) {
    console.error("Error evaluating interview:", err);
    res.status(500).json({ message: "Evaluation failed", error: err.message });
  }
});
