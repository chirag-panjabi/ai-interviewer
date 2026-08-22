import axios from "axios";
import { config } from "../config";

export interface GithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  url: string;
  readme?: string | null;
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

    const nonForkRepos = reposData.filter((repo: any) => !repo.fork);
    // Sort non-fork repos by stars descending to prioritize the candidate's best work
    nonForkRepos.sort((a: any, b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0));

    // Budget: 3 repos if authenticated with GITHUB_TOKEN, 1 repo if unauthenticated (to conserve 60 req/hr rate limit)
    const readmeLimit = config.GITHUB_TOKEN ? 3 : 1;
    const topReposToFetchReadme = nonForkRepos.slice(0, readmeLimit);

    const readmeMap = new Map<string, string>();
    await Promise.all(
      topReposToFetchReadme.map(async (repo: any) => {
        try {
          const readmeRes = await axios.get(
            `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/readme`,
            {
              headers: {
                ...headers,
                Accept: "application/vnd.github.v3.raw",
              },
              timeout: 5000,
              responseType: "text",
            }
          );
          if (typeof readmeRes.data === "string" && readmeRes.data.trim()) {
            // Truncate to 1500 chars to respect prompt token budget
            readmeMap.set(repo.name, readmeRes.data.trim().slice(0, 1500));
          }
        } catch {
          // Repo might not have a README or rate limit encountered; gracefully continue
        }
      })
    );

    const repos: GithubRepo[] = nonForkRepos.map((repo: any) => ({
      name: repo.name,
      description: repo.description || null,
      language: repo.language || null,
      stars: repo.stargazers_count || 0,
      topics: Array.isArray(repo.topics) ? repo.topics : [],
      url: repo.html_url,
      readme: readmeMap.get(repo.name) || null,
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
