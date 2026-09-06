const { Octokit } = require('@octokit/rest');
const dotenv = require('dotenv');

dotenv.config();

/**
 * GitHub Scanner Service
 * Authenticates via Octokit and fetches public repos + recent commits
 * for a given GitHub username.
 */

function createOctokit() {
  const options = {};
  if (process.env.GITHUB_TOKEN) {
    options.auth = process.env.GITHUB_TOKEN;
  }
  return new Octokit(options);
}

/**
 * Fetch all public repositories for a given username.
 * @param {string} username - GitHub username to scan
 * @returns {Promise<Array>} - Array of repo objects with key metadata
 */
async function fetchPublicRepos(username) {
  const octokit = createOctokit();

  const repos = await octokit.paginate(octokit.repos.listForUser, {
    username,
    type: 'public',
    sort: 'updated',
    per_page: 100,
  });

  return repos.map((repo) => ({
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    description: repo.description,
    language: repo.language,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
    isFork: repo.fork,
  }));
}

/**
 * Fetch recent commits across all public repos for a given username.
 * Retrieves the latest 5 commits per repo.
 * @param {string} username - GitHub username to scan
 * @returns {Promise<Array>} - Array of commit objects grouped by repo
 */
async function fetchRecentCommits(username) {
  const octokit = createOctokit();
  const repos = await fetchPublicRepos(username);
  const results = [];

  for (const repo of repos.slice(0, 10)) {
    try {
      const { data: commits } = await octokit.repos.listCommits({
        owner: username,
        repo: repo.name,
        per_page: 5,
      });

      results.push({
        repo: repo.name,
        commits: commits.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
          author: c.commit.author.name,
          date: c.commit.author.date,
          url: c.html_url,
          rawPatch: c.files ? c.files.map((f) => f.patch).join('\n') : null,
        })),
      });
    } catch (err) {
      results.push({
        repo: repo.name,
        commits: [],
        error: err.message,
      });
    }
  }

  return results;
}

/**
 * Full GitHub scan: repos + commits with raw text payloads.
 * @param {string} username - GitHub username to scan
 * @returns {Promise<Object>} - Complete scan results
 */
async function scanGitHub(username) {
  const repos = await fetchPublicRepos(username);
  const commits = await fetchRecentCommits(username);

  return {
    username,
    scannedAt: new Date().toISOString(),
    totalRepos: repos.length,
    repos,
    commits,
  };
}

module.exports = { fetchPublicRepos, fetchRecentCommits, scanGitHub };
