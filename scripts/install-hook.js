const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[TraceGuard] Installing pre-commit hook...');

try {
  const rootDir = execSync('git rev-parse --show-toplevel').toString().trim();
  const hooksDir = path.join(rootDir, '.git', 'hooks');
  const preCommitFile = path.join(hooksDir, 'pre-commit');

  if (!fs.existsSync(hooksDir)) {
    console.error('[TraceGuard] Error: .git/hooks directory not found. Are you in a git repository?');
    process.exit(1);
  }

  // Hook script content
  // We use node to execute the CLI script
  const hookContent = `#!/bin/sh
# TraceGuard Pre-Commit Hook
# Bypasses normal commit if secrets are detected

node "$(git rev-parse --show-toplevel)/cli/pre-commit.js"
`;

  fs.writeFileSync(preCommitFile, hookContent);
  
  // Make it executable (for Unix/Linux/macOS)
  try {
    execSync(`chmod +x "${preCommitFile}"`);
  } catch (e) {
    // Windows might fail chmod, that's fine
  }

  console.log('\x1b[32m[TraceGuard] Successfully installed pre-commit hook!\x1b[0m');
  console.log('TraceGuard will now automatically scan your staged files before every commit.');
} catch (err) {
  console.error('[TraceGuard] Failed to install hook:', err.message);
}
