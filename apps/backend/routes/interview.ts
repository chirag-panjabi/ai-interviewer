import { Router } from "express";
import { PreInterviewBody } from "../types";
import { scrapeGithub } from "../services/github";
import { prisma } from "../db";
import { calculateResult } from "../services/evaluation";
import { interviewCreationLimiter } from "../middleware/rateLimiter";

export const interviewRouter = Router();

// 1. Ingest GitHub profile and initialize interview (Rate limited to 15 / day / IP)
interviewRouter.post("/pre-interview", interviewCreationLimiter, async (req, res) => {
  const { success, data } = PreInterviewBody.safeParse(req.body);

  if (!success) {
    res.status(400).json({
      message: "Invalid request body. Expected { github: string }.",
    });
    return;
  }

  try {
    const githubData = await scrapeGithub(data.github);

    const interview = await prisma.interview.create({
      data: {
        githubMetadata: JSON.stringify(githubData),
        experienceLevel: data.experienceLevel,
        track: data.track,
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
      include: { conversations: { orderBy: { createdAt: "asc" } } },
    });

    if (!interview) {
      res.status(404).json({ message: "Interview not found" });
      return;
    }

    const transcript = interview.conversations.map((c) => ({
      type: c.type,
      content: c.message,
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

    // Run evaluation with Gemini 3.7 Flash, tailored to level & track
    const result = await calculateResult(
      interview.conversations,
      interview.githubMetadata,
      interview.experienceLevel,
      interview.track
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
