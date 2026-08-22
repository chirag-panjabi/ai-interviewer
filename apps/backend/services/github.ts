import axios from "axios";
import https from "https";
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
  let cleaned = input.trim();
  
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
  const username = parts[0];

  if (!username) {
    throw new Error("Invalid GitHub profile URL or username");
  }

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

async function fetchReposFromHtmlFallback(username: string): Promise<GithubRepoPreview[]> {
  try {
    const res = await axios.get(`https://github.com/${encodeURIComponent(username)}?tab=repositories`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      httpsAgent,
      timeout: 6000,
    });

    const html = res.data;
    if (typeof html !== "string") return [];

    const repos: GithubRepoPreview[] = [];
    const seen = new Set<string>();

    const repoMatchRegex = new RegExp(`href="/${username}/([^"/?#\\s]+)"(?:[^>]*itemprop="name codeRepository"|[^>]*data-hovercard-type="repository")`, "gi");
    let match;
    while ((match = repoMatchRegex.exec(html)) !== null) {
      const repoName = match[1]?.trim();
      if (repoName && !seen.has(repoName.toLowerCase()) && !["followers", "following", "stars", "tab", "repositories"].includes(repoName.toLowerCase())) {
        seen.add(repoName.toLowerCase());
        repos.push({
          name: repoName,
          description: null,
          language: null,
          stars: 0,
          url: `https://github.com/${username}/${repoName}`,
        });
      }
      if (repos.length >= 8) break;
    }

    if (repos.length === 0) {
      const fallbackRegex = new RegExp(`itemprop="name codeRepository">\\s*([^<\\s]+)\\s*<`, "gi");
      let fbMatch;
      while ((fbMatch = fallbackRegex.exec(html)) !== null) {
        const repoName = fbMatch[1]?.trim();
        if (repoName && !seen.has(repoName.toLowerCase())) {
          seen.add(repoName.toLowerCase());
          repos.push({
            name: repoName,
            description: null,
            language: null,
            stars: 0,
            url: `https://github.com/${username}/${repoName}`,
          });
        }
        if (repos.length >= 8) break;
      }
    }

    return repos;
  } catch (err: any) {
    console.warn(`[GitHubPreview] HTML fallback scraping failed for ${username}:`, err?.message);
    return [];
  }
}

export async function getGithubReposPreview(input: string): Promise<GithubProfilePreview> {
  const { username, repoName } = parseGithubInput(input);
  const cacheKey = username.toLowerCase();
  const now = Date.now();

  const cached = previewCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const headers: Record<string, string> = {
    "User-Agent": "AI-Interviewer-App",
    Accept: "application/vnd.github.v3+json",
  };

  if (config.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${config.GITHUB_TOKEN}`;
  }

  try {
    const userRes = await axios.get(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
      httpsAgent,
      timeout: 6000,
    });
    const userData = userRes.data;

    const reposRes = await axios.get(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=20`,
      {
        headers,
        httpsAgent,
        timeout: 6000,
      }
    );

    const reposData = Array.isArray(reposRes.data) ? reposRes.data : [];
    const nonForkRepos = reposData.filter((r: any) => !r.fork);
    
    // Sort by stars descending
    nonForkRepos.sort((a: any, b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0));

    // If user provided a specific repoName, move it to the top
    if (repoName) {
      const idx = nonForkRepos.findIndex((r: any) => r.name.toLowerCase() === repoName.toLowerCase());
      if (idx > 0) {
        const [target] = nonForkRepos.splice(idx, 1);
        if (target) nonForkRepos.unshift(target);
      }
    }

    const previewRepos: GithubRepoPreview[] = nonForkRepos.slice(0, 8).map((r: any) => ({
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
      publicReposCount: userData.public_repos || previewRepos.length,
      repos: previewRepos,
    };

    previewCache.set(cacheKey, { timestamp: now, data: result });
    return result;
  } catch (err: any) {
    console.warn(`[GitHubPreview] API rate-limit/error for ${username}: ${err?.response?.data?.message || err.message}. Trying HTML scraper fallback...`);
    
    const fallbackRepos = await fetchReposFromHtmlFallback(username);
    
    // If specific repo was passed in URL, make sure it's included
    if (repoName && !fallbackRepos.some(r => r.name.toLowerCase() === repoName.toLowerCase())) {
      fallbackRepos.unshift({
        name: repoName,
        description: null,
        language: null,
        stars: 0,
        url: `https://github.com/${username}/${repoName}`,
      });
    }

    const result: GithubProfilePreview = {
      username,
      name: username,
      bio: null,
      avatarUrl: `https://github.com/${username}.png`,
      publicReposCount: fallbackRepos.length,
      repos: fallbackRepos,
    };

    if (fallbackRepos.length > 0) {
      previewCache.set(cacheKey, { timestamp: now, data: result });
    }

    return result;
  }
}

export async function scrapeGithub(input: string, explicitSelectedRepo?: string): Promise<GithubPortfolio> {
  const { username, repoName: parsedRepoName } = parseGithubInput(input);
  const targetRepoName = explicitSelectedRepo || parsedRepoName;

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
    const nonForkRepos = reposData.filter((repo: any) => !repo.fork);
    nonForkRepos.sort((a: any, b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0));

    // Determine target repos to fetch README
    const reposToFetchReadme: string[] = [];

    if (targetRepoName) {
      reposToFetchReadme.push(targetRepoName);
    } else {
      // Fetch README for top 1-2 starred repos
      const limit = config.GITHUB_TOKEN ? 2 : 1;
      nonForkRepos.slice(0, limit).forEach((r: any) => reposToFetchReadme.push(r.name));
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
