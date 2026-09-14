const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

const { scanGitHub, fetchDeepCommitDiffs } = require('./services/githubScanner');
const { scanWeb } = require('./services/webScanner');
const { enumerateSubdomains } = require('./services/subdomainScanner');
const { scanText, scanPayloads } = require('./services/secretEngine');

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'TraceGuard Backend is healthy' });
});

// ─── GitHub Scan Endpoint ───────────────────────────────────────────────────
app.post('/api/scan/github', async (req, res) => {
  const { target } = req.body;

  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "target" (GitHub username) in request body.' });
  }

  try {
    console.log(`[TraceGuard] Starting GitHub scan for: ${target}`);
    const scanData = await scanGitHub(target);

    // Build text payloads from commit messages + patches for secret scanning
    const payloads = [];

    for (const repoCommits of scanData.commits) {
      for (const commit of repoCommits.commits) {
        // Scan commit messages
        payloads.push({
          text: commit.message,
          source: `${repoCommits.repo}/commit/${commit.sha.slice(0, 7)}`,
        });

        // Scan raw patches if available
        if (commit.rawPatch) {
          payloads.push({
            text: commit.rawPatch,
            source: `${repoCommits.repo}/patch/${commit.sha.slice(0, 7)} (Historical Leak)`,
          });
        }
      }
    }

    // Phase 4: Deep Git Commit Diff Scanning
    // Fetch deep diffs for a subset of repos to avoid rate limits
    for (const repo of scanData.repos.slice(0, 5)) {
      console.log(`[TraceGuard] Fetching deep commit diffs for ${repo.name}...`);
      const deepCommits = await fetchDeepCommitDiffs(target, repo.name);
      
      for (const commit of deepCommits) {
        if (commit.rawPatch) {
          payloads.push({
            text: commit.rawPatch,
            source: `${repo.name}/patch/${commit.sha.slice(0, 7)} (Historical Leak)`,
          });
        }
      }
    }

    const secrets = scanPayloads(payloads);

    console.log(`[TraceGuard] GitHub scan complete — ${secrets.length} secret(s) flagged across ${scanData.totalRepos} repos.`);

    res.status(200).json({
      scanType: 'github',
      target,
      scannedAt: scanData.scannedAt,
      totalRepos: scanData.totalRepos,
      totalCommitsScanned: payloads.length,
      secrets,
      summary: {
        critical: secrets.filter((s) => s.severity === 'CRITICAL').length,
        high: secrets.filter((s) => s.severity === 'HIGH').length,
        medium: secrets.filter((s) => s.severity === 'MEDIUM').length,
        low: secrets.filter((s) => s.severity === 'LOW').length,
      },
    });
  } catch (err) {
    console.error(`[TraceGuard] GitHub scan error: ${err.message}`);
    res.status(500).json({ error: `GitHub scan failed: ${err.message}` });
  }
});

// ─── Web Scan Endpoint ──────────────────────────────────────────────────────
app.post('/api/scan/web', async (req, res) => {
  const { target } = req.body;

  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "target" (URL) in request body.' });
  }

  // Ensure URL has a protocol prefix
  const url = target.startsWith('http') ? target : `https://${target}`;
  const targetUrlObj = new URL(url);
  const domain = targetUrlObj.hostname.replace(/^www\./, '');

  try {
    console.log(`[TraceGuard] Enumerating subdomains for: ${domain}`);
    const subdomains = await enumerateSubdomains(domain);
    console.log(`[TraceGuard] Found ${subdomains.length} subdomains. Starting Web scans...`);

    // Scan original target + top 3 subdomains (to avoid massive parallel load)
    const scanTargets = [url];
    subdomains.slice(0, 3).forEach(sub => {
      scanTargets.push(`https://${sub}`);
    });

    const payloads = [];
    const exposedFiles = [];
    let scriptBundlesCount = 0;
    let probesRunCount = 0;

    for (const scanTarget of scanTargets) {
      console.log(`[TraceGuard] Scanning target: ${scanTarget}`);
      const scanData = await scanWeb(scanTarget);

      scriptBundlesCount += scanData.page.scriptBundles.length;
      probesRunCount += scanData.probeResults.length;

      // Scan raw page HTML
      payloads.push({ text: scanData.page.rawHtml, source: `${scanTarget} (page source)` });

      // Scan fetched script bundle contents
      for (const script of scanData.scriptContents) {
        if (script.content) {
          payloads.push({ text: script.content, source: script.url });
        }
      }

      // Scan exposed file probe results
      for (const probe of scanData.probeResults) {
        if (probe.exposed && probe.content) {
          payloads.push({ text: probe.content, source: `${scanTarget}${probe.path}` });
        }
      }

      // Also flag exposed server files as their own finding
      scanData.probeResults
        .filter((p) => p.exposed)
        .forEach((p) => {
          exposedFiles.push({
            type: 'Exposed Server File',
            severity: 'CRITICAL',
            source: p.url,
            redactedPreview: `HTTP ${p.status} — ${p.contentLength} bytes exposed`,
            description: `Server file ${p.path} is publicly accessible and returned HTTP ${p.status}.`,
            charIndex: 0,
            lineContext: '',
          });
        });
    }

    const secrets = scanPayloads(payloads);

    // Flag enumerated subdomains as informational findings
    const subdomainFindings = subdomains.map((sub) => ({
      type: 'Subdomain (crt.sh)',
      severity: 'LOW',
      source: `https://crt.sh/?q=%25.${domain}`,
      redactedPreview: sub,
      description: `Discovered active subdomain via Certificate Transparency logs.`,
      charIndex: 0,
      lineContext: '',
    }));

    const allFindings = [...exposedFiles, ...subdomainFindings, ...secrets];

    console.log(`[TraceGuard] Web scan complete — ${allFindings.length} finding(s) total.`);

    res.status(200).json({
      scanType: 'web',
      target: url,
      scannedAt: new Date().toISOString(),
      scriptBundlesFound: scriptBundlesCount,
      probesRun: probesRunCount,
      subdomainsDiscovered: subdomains.length,
      secrets: allFindings,
      summary: {
        critical: allFindings.filter((s) => s.severity === 'CRITICAL').length,
        high: allFindings.filter((s) => s.severity === 'HIGH').length,
        medium: allFindings.filter((s) => s.severity === 'MEDIUM').length,
        low: allFindings.filter((s) => s.severity === 'LOW').length,
      },
    });
  } catch (err) {
    console.error(`[TraceGuard] Web scan error: ${err.message}`);
    res.status(500).json({ error: `Web scan failed: ${err.message}` });
  }
});

// ─── Raw Text Scan Endpoint ───────────────────────────────────────────────────
app.post('/api/scan/text', async (req, res) => {
  const { text, source } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "text" in request body.' });
  }

  try {
    const scanSource = source || 'Unknown Extension Context';
    const payloads = [{ text, source: scanSource }];
    
    const secrets = scanPayloads(payloads);

    res.status(200).json({
      scanType: 'text',
      target: scanSource,
      scannedAt: new Date().toISOString(),
      secrets,
    });
  } catch (err) {
    console.error(`[TraceGuard] Text scan error: ${err.message}`);
    res.status(500).json({ error: `Text scan failed: ${err.message}` });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`TraceGuard Server is running on port ${PORT}`);
});
