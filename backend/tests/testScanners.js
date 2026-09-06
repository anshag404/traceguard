/**
 * TraceGuard Phase 2 - Standalone Test Script
 * Tests both the GitHub Scanner and Web Scanner services.
 *
 * Usage: node tests/testScanners.js
 */

const { fetchPublicRepos, fetchRecentCommits } = require('../services/githubScanner');
const { extractScriptBundles, probeExposedFiles } = require('../services/webScanner');

const TEST_GITHUB_USER = 'octocat';
const TEST_WEB_URL = 'https://example.com';

async function testGitHubScanner() {
  console.log('='.repeat(60));
  console.log('  TESTING: GitHub Scanner');
  console.log('='.repeat(60));

  try {
    console.log(`\n[1/2] Fetching public repos for "${TEST_GITHUB_USER}"...`);
    const repos = await fetchPublicRepos(TEST_GITHUB_USER);
    console.log(`  ✓ Found ${repos.length} public repos`);
    if (repos.length > 0) {
      console.log(`  → First repo: ${repos[0].name} (${repos[0].language || 'N/A'})`);
      console.log(`  → URL: ${repos[0].url}`);
    }

    console.log(`\n[2/2] Fetching recent commits for "${TEST_GITHUB_USER}"...`);
    const commits = await fetchRecentCommits(TEST_GITHUB_USER);
    const totalCommits = commits.reduce((sum, r) => sum + r.commits.length, 0);
    console.log(`  ✓ Fetched ${totalCommits} commits across ${commits.length} repos`);
    if (commits.length > 0 && commits[0].commits.length > 0) {
      const first = commits[0].commits[0];
      console.log(`  → Latest: "${first.message.split('\n')[0]}" by ${first.author}`);
    }

    console.log('\n✅ GitHub Scanner: PASSED\n');
  } catch (err) {
    console.error(`\n❌ GitHub Scanner: FAILED — ${err.message}\n`);
  }
}

async function testWebScanner() {
  console.log('='.repeat(60));
  console.log('  TESTING: Web Scanner');
  console.log('='.repeat(60));

  try {
    console.log(`\n[1/2] Extracting script bundles from "${TEST_WEB_URL}"...`);
    const result = await extractScriptBundles(TEST_WEB_URL);
    console.log(`  ✓ Page fetched (${result.rawHtml.length} bytes)`);
    console.log(`  ✓ Found ${result.scriptBundles.length} script bundle(s)`);
    result.scriptBundles.forEach((s) => console.log(`    → ${s}`));

    console.log(`\n[2/2] Probing for exposed files on "${TEST_WEB_URL}"...`);
    const probes = await probeExposedFiles(TEST_WEB_URL);
    probes.forEach((p) => {
      const icon = p.exposed ? '⚠️  EXPOSED' : '🔒 Not found';
      console.log(`  ${icon} ${p.path} → HTTP ${p.status} (${p.contentLength} bytes)`);
    });

    console.log('\n✅ Web Scanner: PASSED\n');
  } catch (err) {
    console.error(`\n❌ Web Scanner: FAILED — ${err.message}\n`);
  }
}

(async () => {
  console.log('\n🛡️  TraceGuard Scanner Test Suite\n');
  await testGitHubScanner();
  await testWebScanner();
  console.log('='.repeat(60));
  console.log('  All tests complete.');
  console.log('='.repeat(60));
})();
