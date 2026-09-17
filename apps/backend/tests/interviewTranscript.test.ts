import { describe, it, expect, afterAll } from "bun:test";
import { prisma } from "../db";
import axios from "axios";

const BACKEND_PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${BACKEND_PORT}/api/v1`;

describe("Interview Transcript API Endpoint", () => {
  let createdInterviewId: string | null = null;

  afterAll(async () => {
    if (createdInterviewId) {
      await prisma.message.deleteMany({ where: { interviewId: createdInterviewId } }).catch(() => {});
      await prisma.interview.delete({ where: { id: createdInterviewId } }).catch(() => {});
    }
  });

  it("should return 404 for non-existent interviewId", async () => {
    try {
      await axios.get(`${BASE_URL}/transcript/00000000-0000-0000-0000-000000000000`);
      expect(true).toBe(false); // Should not reach here
    } catch (err: any) {
      expect(err.response?.status).toBe(404);
      expect(err.response?.data?.error).toBe("Interview not found");
    }
  });

  it("should return empty turns array for newly created interview with no messages", async () => {
    const interview = await prisma.interview.create({
      data: {
        status: "IN_PROGRESS",
        experienceLevel: "SENIOR",
        track: "SYSTEM_DESIGN",
      },
    });
    createdInterviewId = interview.id;

    const res = await axios.get(`${BASE_URL}/transcript/${interview.id}`);
    expect(res.status).toBe(200);
    expect(res.data.interviewId).toBe(interview.id);
    expect(res.data.status).toBe("IN_PROGRESS");
    expect(Array.isArray(res.data.turns)).toBe(true);
    expect(res.data.turns.length).toBe(0);
  });

  it("should return persisted messages in correct chronological order with mapped speakers", async () => {
    if (!createdInterviewId) throw new Error("No test interview ID");

    // Add 3 turns: Turn 1 (Assistant), Turn 2 (User), Turn 3 (Assistant - Interrupted)
    await prisma.message.create({
      data: {
        interviewId: createdInterviewId,
        type: "Assistant",
        message: "Hey Chirag, give me a quick 60-second summary.",
        turnIndex: 1,
        wasInterrupted: false,
      },
    });

    await prisma.message.create({
      data: {
        interviewId: createdInterviewId,
        type: "User",
        message: "I am a Senior Systems Engineer working on StreamPulse.",
        turnIndex: 2,
        wasInterrupted: false,
      },
    });

    await prisma.message.create({
      data: {
        interviewId: createdInterviewId,
        type: "Assistant",
        message: "How did you structure those zero-copy ring buffers? [Interrupted]",
        turnIndex: 3,
        wasInterrupted: true,
      },
    });

    const res = await axios.get(`${BASE_URL}/interview/${createdInterviewId}/transcript`);
    expect(res.status).toBe(200);
    expect(res.data.turns.length).toBe(3);

    // Turn 1
    expect(res.data.turns[0].speaker).toBe("assistant");
    expect(res.data.turns[0].turnIndex).toBe(1);
    expect(res.data.turns[0].wasInterrupted).toBe(false);
    expect(res.data.turns[0].text).toContain("60-second summary");

    // Turn 2
    expect(res.data.turns[1].speaker).toBe("user");
    expect(res.data.turns[1].turnIndex).toBe(2);
    expect(res.data.turns[1].text).toContain("StreamPulse");

    // Turn 3
    expect(res.data.turns[2].speaker).toBe("assistant");
    expect(res.data.turns[2].turnIndex).toBe(3);
    expect(res.data.turns[2].wasInterrupted).toBe(true);
    expect(res.data.turns[2].text).toContain("[Interrupted]");
  });
});
