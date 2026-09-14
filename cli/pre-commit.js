#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try to locate secretEngine (might be in different path depending on how hook is installed)
let secretEngine;
try {
  // If run from root via traceguard/cli/pre-commit.js
  secretEngine = require('../backend/services/secretEngine');
} catch (e) {
  try {
    // If run from .git/hooks/pre-commit
    const rootDir = execSync('git rev-parse --show-toplevel').toString().trim();
    secretEngine = require(path.join(rootDir, 'backend', 'services', 'secretEngine'));
  } catch (err) {
    console.error('\x1b[31m[TraceGuard] Error: Could not locate backend/services/secretEngine.js\x1b[0m');
    process.exit(0); // Fail open if engine missing
  }
}

const { scanPayloads } = secretEngine;

console.log('\x1b[36m[TraceGuard]\x1b[0m Scanning staged files for secrets...');

try {
  // Get all staged file diffs
  const diffOutput = execSync('git diff --cached').toString();

  if (!diffOutput.trim()) {
    process.exit(0);
  }

  // Pass the raw unified diff to our scanner
  const payloads = [{
    text: diffOutput,
    source: 'Git Staged Diff'
  }];

  const secrets = scanPayloads(payloads);

  if (secrets.length > 0) {
    console.log('\n\x1b[41m\x1b[37m 🚨 TraceGuard Blocked Commit \x1b[0m\n');
    console.log(`Detected \x1b[31m${secrets.length} secret(s)\x1b[0m in your staged files:\n`);
    
    secrets.forEach((s, idx) => {
      console.log(`\x1b[33m${idx + 1}. ${s.type} (Severity: ${s.severity})\x1b[0m`);
      console.log(`   Entropy: ${s.entropyScore || 'N/A'}`);
      console.log(`   Preview: ${s.redactedPreview}`);
      console.log(`   Context: ${s.lineContext}\n`);
    });

    console.log('\x1b[31mCommit aborted. Please remove the secrets and stage your files again.\x1b[0m\n');
    process.exit(1); // Block commit
  } else {
    console.log('\x1b[32m[TraceGuard] No secrets detected. Proceeding with commit.\x1b[0m');
    process.exit(0);
  }
} catch (err) {
  console.error('\x1b[31m[TraceGuard] Internal error during scan:\x1b[0m', err.message);
  process.exit(0); // Fail open
}
