const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

const { scanGitHub } = require('./services/githubScanner');
const { scanWeb } = require('./services/webScanner');
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
            source: `${repoCommits.repo}/patch/${commit.sha.slice(0, 7)}`,
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

  try {
    console.log(`[TraceGuard] Starting Web scan for: ${url}`);
    const scanData = await scanWeb(url);

    // Build payloads from page HTML, script bundles, and probe results
    const payloads = [];

    // Scan raw page HTML
    payloads.push({ text: scanData.page.rawHtml, source: `${url} (page source)` });

    // Scan fetched script bundle contents
    for (const script of scanData.scriptContents) {
      if (script.content) {
        payloads.push({ text: script.content, source: script.url });
      }
    }

    // Scan exposed file probe results
    for (const probe of scanData.probeResults) {
      if (probe.exposed && probe.content) {
        payloads.push({ text: probe.content, source: `${url}${probe.path}` });
      }
    }

    const secrets = scanPayloads(payloads);

    // Also flag exposed server files as their own finding
    const exposedFiles = scanData.probeResults
      .filter((p) => p.exposed)
      .map((p) => ({
        type: 'Exposed Server File',
        severity: 'CRITICAL',
        source: p.url,
        redactedPreview: `HTTP ${p.status} — ${p.contentLength} bytes exposed`,
        description: `Server file ${p.path} is publicly accessible and returned HTTP ${p.status}.`,
        charIndex: 0,
        lineContext: '',
      }));

    const allFindings = [...exposedFiles, ...secrets];

    console.log(`[TraceGuard] Web scan complete — ${allFindings.length} finding(s) from ${url}.`);

    res.status(200).json({
      scanType: 'web',
      target: url,
      scannedAt: scanData.scannedAt,
      scriptBundlesFound: scanData.page.scriptBundles.length,
      probesRun: scanData.probeResults.length,
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

// Start the server
app.listen(PORT, () => {
  console.log(`TraceGuard Server is running on port ${PORT}`);
});
