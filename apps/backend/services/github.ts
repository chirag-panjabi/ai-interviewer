import axios from "axios";
import { config } from "../config";

export interface GithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  url: string;
}

export interface GithubPortfolio {
  username: string;
  name: string | null;
  bio: string | null;
  publicReposCount: number;
  repos: GithubRepo[];
}

export function parseGithubUsername(input: string): string {
  let cleaned = input.trim();
  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//i, "");
  // Remove domain
  cleaned = cleaned.replace(/^github\.com\//i, "");
  // Remove query params or hashes
  const withoutQuery = cleaned.split("?")[0] ?? "";
  cleaned = withoutQuery.split("#")[0] ?? "";
  // Remove trailing slashes and take the first segment
  const parts = cleaned.split("/").filter(Boolean);
  const username = parts[0];
  if (!username) {
    throw new Error("Invalid GitHub profile URL or username");
  }
  return username;
}

export async function scrapeGithub(input: string): Promise<GithubPortfolio> {
  const username = parseGithubUsername(input);

  const headers: Record<string, string> = {
    "User-Agent": "AI-Interviewer-App",
    Accept: "application/vnd.github.v3+json",
  };

  if (config.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${config.GITHUB_TOKEN}`;
  }

  try {
    // Fetch user profile info
    const userRes = await axios.get(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
      timeout: 10000,
    });

    const userData = userRes.data;

    // Fetch user repos (up to 15 most recently updated)
    const reposRes = await axios.get(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=15`,
      {
        headers,
        timeout: 10000,
      }
    );

    const reposData = Array.isArray(reposRes.data) ? reposRes.data : [];

    const repos: GithubRepo[] = reposData
      .filter((repo: any) => !repo.fork) // prioritize original projects
      .map((repo: any) => ({
        name: repo.name,
        description: repo.description || null,
        language: repo.language || null,
        stars: repo.stargazers_count || 0,
        topics: Array.isArray(repo.topics) ? repo.topics : [],
        url: repo.html_url,
      }));

    return {
      username: userData.login || username,
      name: userData.name || null,
      bio: userData.bio || null,
      publicReposCount: userData.public_repos || repos.length,
      repos,
    };
  } catch (err: any) {
    console.error(`Error fetching GitHub data for ${username}:`, err?.response?.data || err.message);
    
    // Return a fallback structure with the username so the interview can proceed even if GitHub API is rate-limited
    return {
      username,
      name: username,
      bio: null,
      publicReposCount: 0,
      repos: [],
    };
  }
}
