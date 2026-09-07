/**
 * TraceGuard Secret Engine
 * Regex-based scanner to detect leaked secrets in raw text payloads.
 * Returns structured match objects with type, source, and redacted previews.
 */

const SECRET_PATTERNS = [
  {
    type: 'AWS Access Key',
    regex: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g,
    description: 'AWS Access Key ID (starts with AKIA/ABIA/ACCA/ASIA)',
  },
  {
    type: 'AWS Secret Key',
    regex: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?/g,
    captureGroup: 1,
    description: 'AWS Secret Access Key (40-char base64)',
  },
  {
    type: 'RSA Private Key',
    regex: /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g,
    description: 'PEM-encoded RSA private key block',
  },
  {
    type: 'Private Key (Generic)',
    regex: /-----BEGIN (?:EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    description: 'PEM-encoded private key (EC/DSA/OpenSSH)',
  },
  {
    type: 'Firebase Config',
    regex: /AIza[0-9A-Za-z_-]{35}/g,
    description: 'Firebase / Google Cloud API key',
  },
  {
    type: 'Firebase Project Config',
    regex: /["']?(?:apiKey|authDomain|databaseURL|storageBucket|messagingSenderId|appId|measurementId)["']?\s*[:=]\s*["'][^"']{8,}["']/g,
    description: 'Firebase project configuration value',
  },
  {
    type: 'Bearer Token',
    regex: /(?:Bearer\s+)([A-Za-z0-9\-._~+/]+=*(?:\.[A-Za-z0-9\-._~+/]+=*)*)/g,
    captureGroup: 0,
    description: 'API Bearer token in Authorization header',
  },
  {
    type: 'Generic API Key',
    regex: /(?:api[_-]?key|apikey|api[_-]?secret|api[_-]?token)\s*[=:]\s*["']?([A-Za-z0-9\-._~+/]{20,})["']?/gi,
    captureGroup: 1,
    description: 'Generic API key/secret/token assignment',
  },
  {
    type: 'GitHub Token',
    regex: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g,
    description: 'GitHub personal access or OAuth token',
  },
  {
    type: 'Slack Token',
    regex: /xox[bpors]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,34}/g,
    description: 'Slack bot/user/app token',
  },
];

/**
 * Safely redact a secret value for display.
 * Shows the first 4 and last 4 characters, masks the rest.
 * @param {string} value - The raw secret string
 * @returns {string} - Redacted preview
 */
function redact(value) {
  const trimmed = value.trim();
  if (trimmed.length <= 12) {
    return trimmed.slice(0, 3) + '•'.repeat(Math.max(trimmed.length - 3, 1));
  }
  return trimmed.slice(0, 4) + '•'.repeat(8) + trimmed.slice(-4);
}

/**
 * Scan a raw text payload for secrets.
 * @param {string} text - Raw text content to scan
 * @param {string} source - Source identifier (file path, URL, repo name)
 * @returns {Array<Object>} - Array of match objects
 */
function scanText(text, source) {
  if (!text || typeof text !== 'string') return [];

  const matches = [];

  for (const pattern of SECRET_PATTERNS) {
    // Reset regex state for each scan
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const rawValue = pattern.captureGroup !== undefined
        ? (match[pattern.captureGroup] || match[0])
        : match[0];

      // Get surrounding context (line where match was found)
      const lineStart = text.lastIndexOf('\n', match.index) + 1;
      const lineEnd = text.indexOf('\n', match.index);
      const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();

      matches.push({
        type: pattern.type,
        description: pattern.description,
        source,
        redactedPreview: redact(rawValue),
        lineContext: redact(line),
        charIndex: match.index,
        severity: getSeverity(pattern.type),
      });
    }
  }

  return matches;
}

/**
 * Assign a severity level based on secret type.
 * @param {string} type - Secret type identifier
 * @returns {string} - Severity: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
 */
function getSeverity(type) {
  const severityMap = {
    'AWS Access Key': 'CRITICAL',
    'AWS Secret Key': 'CRITICAL',
    'RSA Private Key': 'CRITICAL',
    'Private Key (Generic)': 'CRITICAL',
    'GitHub Token': 'CRITICAL',
    'Firebase Config': 'HIGH',
    'Firebase Project Config': 'MEDIUM',
    'Bearer Token': 'HIGH',
    'Generic API Key': 'MEDIUM',
    'Slack Token': 'HIGH',
  };
  return severityMap[type] || 'LOW';
}

/**
 * Scan multiple text payloads at once.
 * @param {Array<{text: string, source: string}>} payloads - Array of { text, source } objects
 * @returns {Array<Object>} - Aggregated array of all matches
 */
function scanPayloads(payloads) {
  const allMatches = [];

  for (const { text, source } of payloads) {
    const matches = scanText(text, source);
    allMatches.push(...matches);
  }

  return allMatches;
}

module.exports = { scanText, scanPayloads, redact, SECRET_PATTERNS };
