import axios from "axios";
import { config } from "../config";
import { type ParsedResume, ParsedResumeSchema } from "../types";

export interface ParseResumeInput {
  pdfBase64?: string;
  text?: string;
  customApiKey?: string;
}

export function extractGithubUsername(urlOrHandle?: string): string | undefined {
  if (!urlOrHandle || typeof urlOrHandle !== "string") return undefined;
  let clean = urlOrHandle.trim();
  if (clean.startsWith("@")) clean = clean.slice(1);
  clean = clean.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  if (clean.toLowerCase().startsWith("github.com/")) {
    clean = clean.slice("github.com/".length);
  }
  const parts = clean.split(/[/?#]/).filter(Boolean);
  if (parts.length > 0 && /^[a-zA-Z0-9_-]+$/.test(parts[0]!)) {
    // Avoid non-user paths
    if (!["features", "topics", "collections", "trending", "events", "sponsor"].includes(parts[0]!.toLowerCase())) {
      return parts[0];
    }
  }
  return undefined;
}

const RESUME_PARSER_SYSTEM_PROMPT = `You are a high-precision technical resume parser for a top-tier software engineering interview platform.
Your task is to analyze the provided candidate resume (PDF or plain text) and extract a structured technical profile.

CRITICAL PARSING RULES:
1. Extract the candidate's actual full name. If not found, use "Candidate".
2. Extract the candidate's target job title or most recent engineering title.
3. Calculate estimated total professional years of engineering experience (number or null).
4. Extract 5-15 relevant technical skills (programming languages, frameworks, cloud tools, databases). Do not include generic buzzwords like "hard worker" or "leadership".
5. Extract key technical projects (up to 5). For each project:
   - name: Title of project
   - description: 1-2 sentence technical summary
   - techStack: Array of technologies used
   - metrics: Quantifiable engineering outcomes if mentioned (e.g. "improved p99 by 35ms", "handled 50k DAU")
6. Extract work history (up to 4 most recent positions) with company, role, duration, and key bullet highlights.
7. Scrape and normalize all external links:
   - Check headers, footers, and project sections for GitHub, LinkedIn, and personal portfolio URLs.
   - For GitHub: extract the clean username handle (e.g. "octocat" from "github.com/octocat" or "github.com/octocat/repo").

STRICT OUTPUT FORMAT:
Respond with ONLY valid, parseable JSON conforming to this exact schema:
{
  "candidateName": "string",
  "targetRole": "string",
  "yearsOfExperience": number or null,
  "skills": ["string", "string"],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "techStack": ["string"],
      "metrics": "string (optional)"
    }
  ],
  "workHistory": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "highlights": ["string"]
    }
  ],
  "links": {
    "githubUsername": "string or omit",
    "githubUrl": "string or omit",
    "linkedinUrl": "string or omit",
    "portfolioUrl": "string or omit"
  }
}`;

export async function parseResume(input: ParseResumeInput): Promise<ParsedResume> {
  const activeKey = input.customApiKey?.trim() || config.GEMINI_API_KEY;
  if (!activeKey) {
    throw new Error("No Gemini API key available for resume parsing. Please provide a Gemini API key.");
  }

  const { pdfBase64, text } = input;
  if (!pdfBase64 && (!text || !text.trim())) {
    throw new Error("Either a PDF file or plain text must be provided.");
  }

  // Construct Gemini request parts
  const parts: any[] = [];

  if (pdfBase64) {
    // Strip data URI prefix if frontend passed data:application/pdf;base64,...
    const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, "").trim();
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: cleanBase64,
      },
    });
    parts.push({
      text: `${RESUME_PARSER_SYSTEM_PROMPT}\n\nPlease parse the attached PDF resume into the required structured JSON format.`,
    });
  } else if (text) {
    parts.push({
      text: `${RESUME_PARSER_SYSTEM_PROMPT}\n\n### RESUME TEXT CONTENT:\n${text.trim().slice(0, 35000)}`,
    });
  }

  const candidateModels = [
    config.GEMINI_EVAL_MODEL || "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
  ];

  let lastError: any = null;

  for (const modelName of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`;

    try {
      console.log(`[ResumeParser] Parsing resume with model: ${modelName}...`);
      const res = await axios.post(
        url,
        {
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 25000,
        }
      );

      const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error(`Empty response from ${modelName}`);
      }

      const parsedJson = JSON.parse(rawText);

      // Normalize GitHub username if URL was extracted
      if (parsedJson.links?.githubUrl && !parsedJson.links?.githubUsername) {
        parsedJson.links.githubUsername = extractGithubUsername(parsedJson.links.githubUrl);
      } else if (parsedJson.links?.githubUsername) {
        parsedJson.links.githubUsername = extractGithubUsername(parsedJson.links.githubUsername);
      }

      const validated = ParsedResumeSchema.parse(parsedJson);
      console.log(
        `[ResumeParser] Succeeded with ${modelName}: Candidate "${validated.candidateName}", ${validated.skills.length} skills, ${validated.projects.length} projects, GitHub: ${validated.links?.githubUsername || "none"}`
      );
      return validated;
    } catch (err: any) {
      lastError = err;
      console.warn(`[ResumeParser] ${modelName} failed: ${err?.response?.data?.error?.message || err.message}`);
    }
  }

  console.error("[ResumeParser] All models failed, returning fallback parsed profile.", lastError);
  // Fallback profile if Gemini fails
  return {
    candidateName: "Candidate",
    targetRole: "Software Engineer",
    yearsOfExperience: 3,
    skills: ["General Software Engineering", "Problem Solving", "System Architecture"],
    projects: [
      {
        name: "Featured Engineering Project",
        description: "Primary engineering system highlighted on resume.",
        techStack: ["Full Stack"],
      },
    ],
    workHistory: [],
    links: {},
  };
}
