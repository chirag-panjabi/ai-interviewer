import axios from "axios";
import https from "node:https";
import { config } from "../config";

const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === "production",
});

export interface GithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  url: string;
  readme?: string | null;
}

export interface GithubRepoPreview {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  url: string;
}

export interface GithubProfilePreview {
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  publicReposCount: number;
  repos: GithubRepoPreview[];
  rateLimited?: boolean;
  error?: string | null;
}

export interface GithubPortfolio {
  username: string;
  name: string | null;
  bio: string | null;
  publicReposCount: number;
  selectedRepo?: string | null;
  repos: GithubRepo[];
}

// In-memory cache for preview queries with a 10-minute TTL
interface CacheEntry {
  timestamp: number;
  data: GithubProfilePreview;
}
const previewCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export function parseGithubInput(input: string): { username: string; repoName?: string } {
  let cleaned = (input || "").trim();
  
  if (!cleaned) {
    return { username: "candidate" };
  }

  // Remove leading @ symbol if user types "@username" or "@username/repo"
  if (cleaned.startsWith("@")) {
    cleaned = cleaned.slice(1);
  }

  // Handle SSH format: git@github.com:owner/repo.git
  if (cleaned.startsWith("git@github.com:")) {
    cleaned = cleaned.replace("git@github.com:", "");
  }

  // Remove protocols and domain
  cleaned = cleaned.replace(/^https?:\/\//i, "");
  cleaned = cleaned.replace(/^www\./i, "");
  cleaned = cleaned.replace(/^github\.com\//i, "");

  // Remove query params or hashes
  const withoutQuery = cleaned.split("?")[0] ?? "";
  cleaned = withoutQuery.split("#")[0] ?? "";

  // Remove trailing .git suffix
  cleaned = cleaned.replace(/\.git$/i, "");

  // Split path segments
  const parts = cleaned.split("/").filter(Boolean);
  const username = parts[0] || "candidate";

  // If a second segment exists and isn't a subpath like 'tab', 'repositories', etc.
  let repoName: string | undefined = undefined;
  if (parts.length >= 2 && !["tab", "repositories", "stars", "followers", "following"].includes(parts[1]!)) {
    repoName = parts[1];
  }

  return { username, repoName };
}

export function parseGithubUsername(input: string): string {
  return parseGithubInput(input).username;
}

function getGithubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "AI-Interviewer-App",
    Accept: "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (config.GITHUB_TOKEN) {
    const cleanToken = config.GITHUB_TOKEN.trim().replace(/^["']|["']$/g, "");
    headers["Authorization"] = `Bearer ${cleanToken}`;
  }

  return headers;
}

export async function getGithubReposPreview(input: string): Promise<GithubProfilePreview> {
  const { username, repoName } = parseGithubInput(input);
  const cacheKey = username.toLowerCase();
  const now = Date.now();

  const cached = previewCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const headers = getGithubHeaders();

  try {
    const userRes = await axios.get(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
      httpsAgent,
      timeout: 8000,
    });
    const userData = userRes.data;

    const reposRes = await axios.get(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`,
      {
        headers,
        httpsAgent,
        timeout: 8000,
      }
    );

    const reposData = Array.isArray(reposRes.data) ? reposRes.data : [];
    
    // Sort: Non-forks first, then by stars descending, then by update time
    const sortedRepos = [...reposData].sort((a: any, b: any) => {
      if (Boolean(a.fork) !== Boolean(b.fork)) {
        return a.fork ? 1 : -1;
      }
      return (b.stargazers_count || 0) - (a.stargazers_count || 0);
    });

    // If user provided a specific repoName, move it to the top
    if (repoName) {
      const idx = sortedRepos.findIndex((r: any) => r.name.toLowerCase() === repoName.toLowerCase());
      if (idx > 0) {
        const [target] = sortedRepos.splice(idx, 1);
        if (target) sortedRepos.unshift(target);
      }
    }

    const previewRepos: GithubRepoPreview[] = sortedRepos.slice(0, 8).map((r: any) => ({
      name: r.name,
      description: r.description || null,
      language: r.language || null,
      stars: r.stargazers_count || 0,
      url: r.html_url,
    }));

    const result: GithubProfilePreview = {
      username: userData.login || username,
      name: userData.name || null,
      bio: userData.bio || null,
      avatarUrl: userData.avatar_url || `https://github.com/${username}.png`,
      publicReposCount: userData.public_repos ?? previewRepos.length,
      repos: previewRepos,
    };

    previewCache.set(cacheKey, { timestamp: now, data: result });
    return result;
  } catch (err: any) {
    const status = err?.response?.status;
    const msg = err?.response?.data?.message || err.message;
    const isRateLimit = status === 403 && typeof msg === "string" && msg.toLowerCase().includes("rate limit");

    console.error(`[GitHubPreview] API error for ${username} (HTTP ${status || "unknown"}): ${msg}`);

    // If local development environment suffers an ISP/network TLS reset (e.g. SSL_ERROR_SYSCALL or unknown cert error)
    if (
      process.env.NODE_ENV !== "production" &&
      (!status || status >= 500 || String(msg).includes("certificate") || String(msg).includes("SSL") || String(msg).includes("ECONNRESET") || String(msg).includes("syscall"))
    ) {
      try {
        console.log(`[GitHubPreview] Local network TLS reset detected. Fetching via upstream cloud proxy for ${username}...`);
        const cloudRes = await axios.post(
          "https://ai-interviewer-backend-6jio.onrender.com/api/v1/github-preview",
          { github: username },
          { timeout: 10000 }
        );
        if (cloudRes.data && Array.isArray(cloudRes.data.repos) && cloudRes.data.repos.length > 0) {
          previewCache.set(cacheKey, { timestamp: now, data: cloudRes.data });
          return cloudRes.data;
        }
      } catch {
        // continue to normal fallback
      }
    }

    // If a specific repo was supplied in URL, preserve it in fallback preview
    const fallbackRepos: GithubRepoPreview[] = [];
    if (repoName) {
      fallbackRepos.push({
        name: repoName,
        description: null,
        language: null,
        stars: 0,
        url: `https://github.com/${username}/${repoName}`,
      });
    }

    return {
      username,
      name: username,
      bio: null,
      avatarUrl: `https://github.com/${username}.png`,
      publicReposCount: fallbackRepos.length,
      repos: fallbackRepos,
      rateLimited: isRateLimit,
      error: isRateLimit
        ? "GitHub API rate limit reached (60 req/hr). Add GITHUB_TOKEN to .env for 5,000 req/hr."
        : status === 401
        ? "GitHub token is invalid or expired."
        : status === 404
        ? "GitHub profile not found."
        : msg,
    };
  }
}

export async function scrapeGithub(input: string, explicitSelectedRepo?: string | null): Promise<GithubPortfolio> {
  const { username, repoName: parsedRepoName } = parseGithubInput(input);
  const targetRepoName = explicitSelectedRepo || parsedRepoName;

  if (!username || username.toLowerCase() === "candidate") {
    return {
      username: "candidate",
      name: "Candidate",
      bio: null,
      publicReposCount: 0,
      selectedRepo: targetRepoName || null,
      repos: [],
    };
  }

  const headers = getGithubHeaders();

  try {
    // Fetch user profile info
    const userRes = await axios.get(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
      httpsAgent,
      timeout: 10000,
    });

    const userData = userRes.data;

    // Fetch user repos (up to 20 most recently updated)
    const reposRes = await axios.get(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=20`,
      {
        headers,
        httpsAgent,
        timeout: 10000,
      }
    );

    const reposData = Array.isArray(reposRes.data) ? reposRes.data : [];
    const sortedRepos = [...reposData].sort((a: any, b: any) => {
      if (Boolean(a.fork) !== Boolean(b.fork)) {
        return a.fork ? 1 : -1;
      }
      return (b.stargazers_count || 0) - (a.stargazers_count || 0);
    });

    // Determine target repos to fetch README
    const reposToFetchReadme: string[] = [];

    if (targetRepoName) {
      reposToFetchReadme.push(targetRepoName);
    } else {
      // Fetch README for top 1-2 starred repos
      const limit = config.GITHUB_TOKEN ? 2 : 1;
      sortedRepos.slice(0, limit).forEach((r: any) => reposToFetchReadme.push(r.name));
    }

    const readmeMap = new Map<string, string>();
    await Promise.all(
      reposToFetchReadme.map(async (name: string) => {
        try {
          const readmeRes = await axios.get(
            `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(name)}/readme`,
            {
              headers: {
                ...headers,
                Accept: "application/vnd.github.v3.raw",
              },
              httpsAgent,
              timeout: 5000,
              responseType: "text",
            }
          );
          if (typeof readmeRes.data === "string" && readmeRes.data.trim()) {
            // Sanitize raw HTML tags and truncate to 2000 chars
            const sanitized = readmeRes.data.replace(/<[^>]*>?/gm, "").trim().slice(0, 2000);
            readmeMap.set(name, sanitized);
          }
        } catch {
          // Repo might not have a README or rate limit encountered; gracefully continue
        }
      })
    );

    const repos: GithubRepo[] = sortedRepos.map((repo: any) => ({
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
      selectedRepo: targetRepoName || null,
      repos,
    };
  } catch (err: any) {
    console.error(`Error fetching GitHub data for ${username}:`, err?.response?.data || err.message);
    
    return {
      username,
      name: username,
      bio: null,
      publicReposCount: 0,
      selectedRepo: targetRepoName || null,
      repos: [],
    };
  }
}
