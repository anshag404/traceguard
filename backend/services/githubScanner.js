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
 * Deep Git Commit Diff Scanning: Query a repository's last 15 commits and extract patch blocks.
 * Requires querying each commit individually via GET /repos/{owner}/{repo}/commits/{ref}
 * to retrieve the file diffs/patches (which listCommits omits).
 * @param {string} username - GitHub username (owner)
 * @param {string} repoName - Repository name
 * @returns {Promise<Array>} - Array of commit objects with full patch blocks
 */
async function fetchDeepCommitDiffs(username, repoName) {
  const octokit = createOctokit();
  
  try {
    // 1. Get the list of the last 15 commits
    const { data: commitList } = await octokit.repos.listCommits({
      owner: username,
      repo: repoName,
      per_page: 15,
    });

    const detailedCommits = [];

    // 2. Fetch each commit individually to get the file patches
    for (const shallowCommit of commitList) {
      try {
        const { data: fullCommit } = await octokit.repos.getCommit({
          owner: username,
          repo: repoName,
          ref: shallowCommit.sha,
        });

        const patchData = fullCommit.files 
          ? fullCommit.files.map(f => f.patch).filter(Boolean).join('\n') 
          : '';

        detailedCommits.push({
          sha: fullCommit.sha,
          message: fullCommit.commit.message,
          author: fullCommit.commit.author.name,
          date: fullCommit.commit.author.date,
          url: fullCommit.html_url,
          rawPatch: patchData, // Extracted patch block
        });
      } catch (err) {
        console.error(`[TraceGuard] Failed to fetch deep diff for ${shallowCommit.sha}: ${err.message}`);
      }
    }

    return detailedCommits;
  } catch (err) {
    console.error(`[TraceGuard] Failed to fetch commit list for ${repoName}: ${err.message}`);
    return [];
  }
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

module.exports = { fetchPublicRepos, fetchRecentCommits, fetchDeepCommitDiffs, scanGitHub };
