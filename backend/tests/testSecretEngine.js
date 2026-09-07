/**
 * TraceGuard Phase 3 - Secret Engine Test Script
 * Tests the regex-based secret scanner against synthetic payloads.
 *
 * Usage: node tests/testSecretEngine.js
 */

const { scanText, scanPayloads, redact } = require('../services/secretEngine');

// ─── Synthetic Test Payloads ────────────────────────────────────────────────

const FAKE_ENV_FILE = `
# Database
DB_HOST=localhost
DB_PASSWORD=supersecret

# AWS Credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# API
API_TOKEN=not-a-real-token
`;

const FAKE_JS_BUNDLE = `
(function(){
  const firebaseConfig = {
    apiKey: "AIzaSyA1B2C3D4E5F6G7H8I9J0KlMnOpQrStUvW",
    authDomain: "my-app-12345.firebaseapp.com",
    databaseURL: "https://my-app-12345.firebaseio.com",
    storageBucket: "my-app-12345.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abc123def456"
  };
  firebase.initializeApp(firebaseConfig);
})();
`;

const FAKE_CONFIG_FILE = `
{
  "api_key": "sk_live_abcdefghijklmnopqrstuvwxyz1234567890",
  "api_secret": "whsec_abcdefghijklmnopqrstuvwxyz",
  "github_token": "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij1234",
  "slack_webhook": "xoxb-1234567890-1234567890123-AbCdEfGhIjKlMnOpQrStUvWx"
}
`;

const FAKE_PRIVATE_KEY = `
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MhgHcTz6sE2I2yPB
aFDrBz9vFqU5zMHsNGzPP2gHJnEhPdRP0sYYHA2RPa0s0w0mPvRNNMf0kBPbFn9t
EXAMPLE_ONLY_NOT_REAL_KEY_DATA_HERE_FOR_TESTING_PURPOSES
-----END RSA PRIVATE KEY-----
`;

const FAKE_BEARER_LOG = `
[2026-09-05 10:30:22] INFO: Request to /api/data
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
[2026-09-05 10:30:23] INFO: Response 200 OK
`;

const CLEAN_FILE = `
<!DOCTYPE html>
<html>
<head><title>Hello World</title></head>
<body><h1>No secrets here!</h1></body>
</html>
`;

// ─── Tests ──────────────────────────────────────────────────────────────────

function printMatches(label, matches) {
  console.log(`\n  ${label}:`);
  if (matches.length === 0) {
    console.log('    (no matches)');
    return;
  }
  matches.forEach((m, i) => {
    console.log(`    [${i + 1}] ${m.severity.padEnd(8)} | ${m.type}`);
    console.log(`        Source:  ${m.source}`);
    console.log(`        Preview: ${m.redactedPreview}`);
  });
}

(async () => {
  console.log('\n🛡️  TraceGuard Secret Engine Test Suite\n');

  let totalFound = 0;
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: AWS keys in .env
  console.log('='.repeat(60));
  console.log('  TEST 1: AWS Credentials in .env file');
  console.log('='.repeat(60));
  const awsMatches = scanText(FAKE_ENV_FILE, 'target.com/.env');
  printMatches('Findings', awsMatches);
  const hasAwsKey = awsMatches.some((m) => m.type === 'AWS Access Key');
  const hasAwsSecret = awsMatches.some((m) => m.type === 'AWS Secret Key');
  if (hasAwsKey && hasAwsSecret) {
    console.log('\n  ✅ PASSED — Detected AWS Access Key + Secret Key');
    testsPassed++;
  } else {
    console.log('\n  ❌ FAILED — Missing AWS key detections');
    testsFailed++;
  }
  totalFound += awsMatches.length;

  // Test 2: Firebase config in JS bundle
  console.log('\n' + '='.repeat(60));
  console.log('  TEST 2: Firebase Config in JS bundle');
  console.log('='.repeat(60));
  const fbMatches = scanText(FAKE_JS_BUNDLE, 'https://target.com/app.bundle.js');
  printMatches('Findings', fbMatches);
  const hasFirebase = fbMatches.some((m) => m.type === 'Firebase Config');
  if (hasFirebase) {
    console.log('\n  ✅ PASSED — Detected Firebase API key');
    testsPassed++;
  } else {
    console.log('\n  ❌ FAILED — Missing Firebase detection');
    testsFailed++;
  }
  totalFound += fbMatches.length;

  // Test 3: GitHub + Slack tokens in config.json
  console.log('\n' + '='.repeat(60));
  console.log('  TEST 3: GitHub & Slack tokens in config.json');
  console.log('='.repeat(60));
  const configMatches = scanText(FAKE_CONFIG_FILE, 'target.com/config.json');
  printMatches('Findings', configMatches);
  const hasGithub = configMatches.some((m) => m.type === 'GitHub Token');
  const hasSlack = configMatches.some((m) => m.type === 'Slack Token');
  if (hasGithub && hasSlack) {
    console.log('\n  ✅ PASSED — Detected GitHub + Slack tokens');
    testsPassed++;
  } else {
    console.log('\n  ❌ FAILED — Missing token detections');
    testsFailed++;
  }
  totalFound += configMatches.length;

  // Test 4: RSA Private Key
  console.log('\n' + '='.repeat(60));
  console.log('  TEST 4: RSA Private Key');
  console.log('='.repeat(60));
  const keyMatches = scanText(FAKE_PRIVATE_KEY, 'target.com/.git/config');
  printMatches('Findings', keyMatches);
  const hasRsa = keyMatches.some((m) => m.type === 'RSA Private Key');
  if (hasRsa) {
    console.log('\n  ✅ PASSED — Detected RSA Private Key');
    testsPassed++;
  } else {
    console.log('\n  ❌ FAILED — Missing RSA key detection');
    testsFailed++;
  }
  totalFound += keyMatches.length;

  // Test 5: Bearer token in logs
  console.log('\n' + '='.repeat(60));
  console.log('  TEST 5: Bearer Token in server logs');
  console.log('='.repeat(60));
  const bearerMatches = scanText(FAKE_BEARER_LOG, 'server.log');
  printMatches('Findings', bearerMatches);
  const hasBearer = bearerMatches.some((m) => m.type === 'Bearer Token');
  if (hasBearer) {
    console.log('\n  ✅ PASSED — Detected Bearer token');
    testsPassed++;
  } else {
    console.log('\n  ❌ FAILED — Missing Bearer token detection');
    testsFailed++;
  }
  totalFound += bearerMatches.length;

  // Test 6: Clean file (no false positives)
  console.log('\n' + '='.repeat(60));
  console.log('  TEST 6: Clean HTML (no false positives)');
  console.log('='.repeat(60));
  const cleanMatches = scanText(CLEAN_FILE, 'clean.html');
  printMatches('Findings', cleanMatches);
  if (cleanMatches.length === 0) {
    console.log('\n  ✅ PASSED — No false positives');
    testsPassed++;
  } else {
    console.log(`\n  ❌ FAILED — ${cleanMatches.length} false positive(s)`);
    testsFailed++;
  }

  // Test 7: Batch scan via scanPayloads
  console.log('\n' + '='.repeat(60));
  console.log('  TEST 7: Batch scan via scanPayloads()');
  console.log('='.repeat(60));
  const batchResults = scanPayloads([
    { text: FAKE_ENV_FILE, source: '.env' },
    { text: FAKE_JS_BUNDLE, source: 'app.js' },
    { text: FAKE_CONFIG_FILE, source: 'config.json' },
  ]);
  console.log(`\n  Batch scan found ${batchResults.length} total secrets across 3 payloads`);
  if (batchResults.length > 0) {
    console.log('\n  ✅ PASSED — Batch scanning works');
    testsPassed++;
  } else {
    console.log('\n  ❌ FAILED — Batch scanning returned no results');
    testsFailed++;
  }

  // Test 8: Redaction utility
  console.log('\n' + '='.repeat(60));
  console.log('  TEST 8: Redaction utility');
  console.log('='.repeat(60));
  const sample = 'AKIAIOSFODNN7EXAMPLE';
  const redacted = redact(sample);
  console.log(`\n  Input:    ${sample}`);
  console.log(`  Redacted: ${redacted}`);
  if (!redacted.includes('IOSFODNN7EXA') && redacted.includes('•')) {
    console.log('\n  ✅ PASSED — Secret is properly masked');
    testsPassed++;
  } else {
    console.log('\n  ❌ FAILED — Redaction is insufficient');
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  RESULTS');
  console.log('='.repeat(60));
  console.log(`\n  Total secrets found: ${totalFound}`);
  console.log(`  Tests passed: ${testsPassed}/${testsPassed + testsFailed}`);
  console.log(`  Tests failed: ${testsFailed}/${testsPassed + testsFailed}`);
  console.log(
    testsFailed === 0
      ? '\n  ✅ All tests PASSED!\n'
      : '\n  ❌ Some tests FAILED.\n'
  );
})();
