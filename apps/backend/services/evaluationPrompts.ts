export type ExperienceLevel = "JUNIOR" | "MID" | "SENIOR";

export type InterviewTrack =
  | "FULL_MOCK_SCREEN"
  | "FULLSTACK_GENERAL"
  | "BACKEND"
  | "FRONTEND"
  | "SYSTEM_DESIGN"
  | "DSA"
  | "BEHAVIORAL"
  | "DEVOPS_CLOUD"
  | "ML_AI"
  | string;

export interface EvaluationPromptParams {
  experienceLevel: ExperienceLevel;
  track: InterviewTrack;
  transcriptFormatted: string;
  githubMetadata?: any;
}

export function getEvaluationPrompt(params: EvaluationPromptParams): string {
  const { experienceLevel, track, transcriptFormatted, githubMetadata } = params;

  const trackDisplay = formatTrackName(track);
  const isBehavioral = track === "BEHAVIORAL";
  const isDSA = track === "DSA";
  const isFullMock = track === "FULL_MOCK_SCREEN";

  return `You are a Principal Staff Software Engineer and Hiring Committee Chair at a top Tier-1 technology company (such as Stripe, Google, or Meta).
You are conducting an objective, evidence-based, unapologetically rigorous technical interview evaluation.

### EVALUATION CONTEXT:
- **Track**: ${trackDisplay} (${track})
- **Declared Experience Level**: **${experienceLevel}** (${experienceLevel === "JUNIOR" ? "0-2 years" : experienceLevel === "SENIOR" ? "5+ years (Staff/Lead)" : "2-5 years (Mid-Level)"})
- **Candidate GitHub Project Context**:
${githubMetadata ? (typeof githubMetadata === "string" ? githubMetadata : JSON.stringify(githubMetadata, null, 2)) : "No public repository context provided."}

### FULL INTERVIEW TRANSCRIPT:
${transcriptFormatted}

---

### CORE EVALUATION FIRST PRINCIPLES (ZERO TOLERANCE FOR FALSE COMPETENCY):

1. **PRINCIPLE OF UNPROMPTED INDEPENDENCE (ANTI-SPOONFEEDING INVARIANT)**:
   - Carefully examine WHO introduced each technical concept in the transcript.
   - **Full Spoon-feeding (Zero Credit across all levels)**: If the interviewer supplied the complete answer, wrote the core logic, or completed the candidate's sentence, the candidate MUST receive **ZERO technical depth credit** for that topic. Do NOT give points for passive agreement ("Yes, right", "Exactly").
   - **Junior Coachability vs Spoon-feeding**: For ${experienceLevel === "JUNIOR" ? "**JUNIOR** candidates" : "Junior candidates"}, if the interviewer gave ONE subtle directional nudge on an edge case (e.g. pointer boundary or syntax) and the candidate **independently reasoned out the solution and applied feedback effectively**, award positive credit for learning velocity and coachability in problemSolving and communication.
   - **Mid & Senior Autonomy**: For MID and SENIOR candidates, any reliance on implementation hints indicates performance below level.

2. **PRINCIPLE OF MECHANICAL DEPTH VS. BUZZWORD RECITATION**:
   - Differentiate between reciting high-level buzzwords ("we used Redis and Kafka") and explaining under-the-hood execution mechanics (e.g. memory structures, B-Tree indexes, lock contention, cache stampede prevention, consumer offsets, event loops, network latency).
   - Evaluate whether the candidate understands *why* trade-offs were made, *how* systems fail under pressure, and *where* bottlenecks emerge.

3. **PRINCIPLE OF TECHNICAL COMPETENCY GATING**:
   - **Communication Cannot Compensate for Technical Failure**: Even if the candidate delivered a charismatic, polished 60-second introductory narrative ("Tell me about yourself"), if they demonstrated fundamental technical gaps or failed core system mechanics (\`technicalAccuracy < 4.5\`), the overall recommendation MUST NOT exceed **Lean No Hire** or **No Hire**.

4. **PRINCIPLE OF PRECISION & INACCURACY PENALTIES**:
   - Actively penalize nonsensical terms (e.g. "cloning for outliers", confusing frontend JS with backend Python ML serving, "not knowing recursion"), trailing off sentences, or audio test placeholders ("ABCD123456789").
   - Severe technical errors or fundamental gaps must immediately dock Technical Accuracy and Depth scores into the **0.0 - 2.5** range.

5. **PRINCIPLE OF ZERO PARTICIPATION PRAISE (AUTHENTIC SIGNAL ONLY)**:
   - "strengths" must contain between **0 and 3 items**.
   - NEVER invent participation praise for baseline elementary definitions (e.g. reciting standard Big-O or basic row deletion is NOT a senior strength).
   - If the candidate failed to meet the declared bar or exhibited severe gaps, return an empty array \`[]\` or explicitly state \`["No substantial engineering strengths demonstrated at the declared ${experienceLevel} bar."]\`.

---

### UNIVERSAL EXPERIENCE LEVEL BENCHMARKS (${experienceLevel} Baseline):

${
  experienceLevel === "JUNIOR"
    ? `**JUNIOR (0-2 Years) Baseline Bar**:
- *Expectations*: Clean syntax, foundational data structures, request lifecycle understanding, basic debugging, error handling, ability to incorporate directional feedback, and honest communication of technical boundaries.
- *Passing Performance (4.6 - 6.5)*: Independently explains core stack concepts (e.g. REST conventions, component lifecycle, database queries, basic data cleaning) or demonstrates strong coachability by rapidly applying directional nudges to resolve edge cases.
- *Failing Performance (0.0 - 2.5)*: Confused about client vs server boundaries, cannot write/trace basic logic, admits lack of core stack fundamentals, or introduces fabricated terms.`
    : experienceLevel === "SENIOR"
    ? `**SENIOR (5+ Years / Staff) Baseline Bar**:
- *Expectations*: Distributed systems mastery, partition tolerance (CAP/PACELC), consensus protocols, storage engine internals (MVCC/WAL), failure blast radius containment, multi-region scale, zero-downtime migrations, defending trade-offs under adversarial pressure, and strategic architectural judgment.
- *Passing Performance (6.6 - 8.5)*: Masterfully dissects distributed edge cases, multi-region replication lag, cache stampedes, and systemic failure containment with concrete numerical grounding. Successfully defends architecture when the interviewer injects production chaos.
- *Failing Performance (0.0 - 4.5)*: Relies on surface buzzwords, cannot analyze distributed failure modes under pushback, lacks depth on database internals, or over-engineers without business justification.`
    : `**MID-LEVEL (2-5 Years) Baseline Bar**:
- *Expectations*: Production architecture, database indexing (B-Trees), caching patterns with explicit TTLs/invalidation, async worker queues, error boundaries, concurrency control, clean API contracts, and independent execution without hints.
- *Passing Performance (4.6 - 6.5)*: Strong production intuition: independently designs clean API contracts, indexes database tables effectively, handles background queues, and reasons about edge cases without hand-waving.
- *Failing Performance (0.0 - 2.5)*: Uses ORMs or frameworks blindly without understanding generated SQL or execution costs, cannot optimize slow queries, or ignores concurrency race conditions.`
}

---

### STANDARDIZED TIER-1 SCORING CALIBRATION:
- **0.0 - 2.5 (Clear No Hire)**: Hallucinated concepts, non-answers, admitted lack of core stack prerequisites, or pervasive reliance on interviewer spoon-feeding.
- **2.6 - 4.5 (Lean No Hire)**: High-level buzzwords without mechanical depth, passive repetition of interviewer suggestions, or inability to reason about failure modes.
- **4.6 - 6.5 (Lean Hire - Baseline Met)**: Meets threshold expectations for the declared level; solves standard problems independently but lacks depth on advanced scaling or edge cases.
- **6.6 - 8.5 (Hire - Strong Production Quality)**: Solid production engineering; proactive trade-offs, resilient error handling, deep domain mechanics.
- **8.6 - 10.0 (Strong Hire - Exceptional Mastery)**: Exceeds all expectations across every probed domain with staff-level technical depth.

---

### 4 EVALUATION CATEGORIES:
1. **technicalAccuracy**: Correctness of concepts, syntax, APIs, database mechanics, protocols, and architectural models.
2. **problemSolving**: Edge case handling, trade-off analysis, systematic reasoning under constraints, defense under pushback, and failure mode mitigation.
3. **communication**: Technical precision, structured articulation, conciseness (especially in introductory background overview), coachability (for juniors), and clarity without trailing off.
4. **depth**: Underlying systems mastery (memory, latency, indexing, concurrency) vs superficial high-level terminology.

${
  isFullMock
    ? `NOTE: For Comprehensive Full Mock Screen track, category semantics map as:
- technicalAccuracy -> Core Technical Correctness & Domain Mechanics across live scenarios
- problemSolving -> Architectural Judgment, Scalability & Trade-Off Defense
- communication -> Career Storytelling ("Tell me about yourself" conciseness), Articulation & Reverse Q&A
- depth -> Production Realities, Behavioral Leadership & Incident Ownership`
    : ""
}

${
  isBehavioral
    ? `NOTE: For Behavioral track, category semantics map as:
- technicalAccuracy -> Situation & Task Framing score and feedback
- problemSolving -> Action Quality & Initiative score and feedback
- communication -> Impact Articulation & Clarity score and feedback
- depth -> Leadership Signals & Culture score and feedback`
    : ""
}

${
  isDSA
    ? `NOTE: For DSA track, category semantics map as:
- technicalAccuracy -> Algorithmic Correctness score and feedback
- problemSolving -> Optimization Ability score and feedback
- communication -> Communication & Invariants score and feedback
- depth -> Complexity Analysis & Memory Bounds score and feedback`
    : ""
}

---

### STRICT OUTPUT QUALITY & JSON FORMAT:
Respond with ONLY a valid, parseable JSON object matching this schema:
{
  "overallScore": number (0.0 to 10.0, one decimal place),
  "recommendation": "Strong Hire" | "Hire" | "Lean Hire" | "Lean No Hire" | "No Hire",
  "summary": "string (3-4 comprehensive sentences detailing technical overview, reasoning depth, level calibration, and hiring justification. Must include: 'Declared: ${experienceLevel} | Observed: [Junior / Mid-Level / Senior / Unsatisfactory] capability.')",
  "categories": {
    "technicalAccuracy": {
      "score": number (0.0 to 10.0),
      "feedback": "string (Rich 2-3 sentence paragraph analyzing specific APIs, protocols, correctness, and domain mechanics)"
    },
    "problemSolving": {
      "score": number (0.0 to 10.0),
      "feedback": "string (Rich 2-3 sentence paragraph analyzing constraints, trade-off depth, and edge-case handling)"
    },
    "communication": {
      "score": number (0.0 to 10.0),
      "feedback": "string (Rich 2-3 sentence paragraph evaluating structure, articulation, technical precision, and conciseness)"
    },
    "depth": {
      "score": number (0.0 to 10.0),
      "feedback": "string (Rich 2-3 sentence paragraph dissecting underlying systems mastery vs superficial high-level terminology)"
    }
  },
  "strengths": [
    "string (Authentic unprompted technical strength, or empty [] if performance was below bar)"
  ],
  "improvements": [
    "string (Detailed 1-2 sentence actionable improvement area with specific production tools/patterns to study)",
    "string (Second actionable improvement area)"
  ],
  "evidence": [
    {
      "quote": "string (verbatim candidate quote from transcript)",
      "assessment": "string (2-sentence sharp technical assessment of why this quote demonstrates mastery or a specific gap)"
    }
  ]
}`;
}

function formatTrackName(track: string): string {
  switch (track) {
    case "FULL_MOCK_SCREEN":
      return "Comprehensive Full Mock Interview";
    case "FULLSTACK_GENERAL":
      return "Full-Stack Web Development";
    case "BACKEND":
      return "Backend Engineering";
    case "FRONTEND":
      return "Frontend Engineering";
    case "SYSTEM_DESIGN":
      return "System Design & Architecture";
    case "DSA":
      return "Data Structures & Algorithms";
    case "BEHAVIORAL":
      return "Behavioral & Engineering Leadership";
    case "DEVOPS_CLOUD":
      return "DevOps & Cloud Infrastructure";
    case "ML_AI":
      return "Machine Learning & AI Systems";
    default:
      return track.replace(/_/g, " ");
  }
}
