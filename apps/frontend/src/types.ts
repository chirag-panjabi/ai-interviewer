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
  | "ML_AI";

export interface ResumeProject {
  name: string;
  description: string;
  techStack: string[];
  metrics?: string;
}

export interface ResumeWorkItem {
  company: string;
  role: string;
  duration?: string;
  highlights: string[];
}

export interface ResumeLinks {
  githubUsername?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
}

export interface ParsedResume {
  candidateName: string;
  targetRole?: string;
  yearsOfExperience?: number | null;
  skills: string[];
  projects: ResumeProject[];
  workHistory: ResumeWorkItem[];
  links: ResumeLinks;
}

export interface RepoPreview {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  url: string;
}

export interface ProfilePreview {
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  publicReposCount: number;
  repos: RepoPreview[];
  rateLimited?: boolean;
  error?: string | null;
}
