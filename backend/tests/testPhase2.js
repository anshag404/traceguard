const { fetchDeepCommitDiffs } = require('../services/githubScanner');
const { enumerateSubdomains } = require('../services/subdomainScanner');

async function runTests() {
  console.log('🛡️ TraceGuard Phase 2 Tests\n');
  
  // Test 1: GitHub Deep Commit Diffs
  console.log('============================================================');
  console.log('  TEST 1: Deep Git Commit Diff Scanning (Last 15 commits)');
  console.log('============================================================');
  try {
    // We test with a known public repo
    const diffs = await fetchDeepCommitDiffs('octocat', 'Hello-World');
    
    if (diffs.length > 0) {
      console.log(`\n  ✅ PASSED — Fetched ${diffs.length} commits with patches.`);
      console.log(`  Sample commit: ${diffs[0].sha.slice(0, 7)} by ${diffs[0].author}`);
      if (diffs[0].rawPatch) {
        console.log(`  Patch block extracted (${diffs[0].rawPatch.length} bytes).`);
      } else {
        console.log(`  (Note: No patch block in this specific commit).`);
      }
    } else {
      console.log('\n  ❌ FAILED — No diffs returned or repo not found.');
    }
  } catch (err) {
    console.log('\n  ❌ FAILED — Error:', err.message);
  }

  // Test 2: crt.sh Subdomain Enumeration
  console.log('\n============================================================');
  console.log('  TEST 2: crt.sh Subdomain Enumeration');
  console.log('============================================================');
  try {
    const domainToTest = 'example.com';
    const subdomains = await enumerateSubdomains(domainToTest);
    
    if (subdomains.length > 0) {
      console.log(`\n  ✅ PASSED — Discovered ${subdomains.length} subdomains for ${domainToTest}.`);
      console.log(`  Samples:`);
      subdomains.slice(0, 3).forEach(sub => console.log(`    - ${sub}`));
      if (subdomains.length > 3) console.log(`    ... and ${subdomains.length - 3} more`);
    } else {
      console.log(`\n  ⚠️  WARNING — No subdomains found for ${domainToTest} (could be expected, or network issue).`);
    }
  } catch (err) {
    console.log('\n  ❌ FAILED — Error:', err.message);
  }
}

runTests();
